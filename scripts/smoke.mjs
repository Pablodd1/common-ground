// Production smoke suite for Unitec Familia.
//
// Usage: BASE_URL=https://… SMOKE_EMAIL=… SMOKE_PASSWORD=… node scripts/smoke.mjs
// Exercises every critical path end-to-end against a live deployment and
// cleans up after itself (deletes the post/file it creates). Exit code 0 only
// when everything passed. The offboarding fixture is a fixed account: it is
// created on first run and re-used afterwards, so recurring runs never
// accumulate users.
const BASE = (process.env.BASE_URL ?? "").replace(/\/+$/, "");
const EMAIL = process.env.SMOKE_EMAIL ?? "";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "";
const OFFBOARD_EMAIL = process.env.SMOKE_OFFBOARD_EMAIL ?? `smoke-offboarding@unitecusadesign.com`;
const OFFBOARD_PASSWORD = process.env.SMOKE_OFFBOARD_PASSWORD ?? "SmokeOffboard-2026!x";

if (!BASE || !EMAIL || !PASSWORD) {
  console.error("BASE_URL, SMOKE_EMAIL and SMOKE_PASSWORD are required.");
  process.exit(2);
}

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorbSetCookie(jar, res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
}

async function trpc(path, { method = "GET", input, jar } = {}) {
  const url = method === "GET" && input
    ? `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${BASE}/api/trpc/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(jar ? { Cookie: cookieHeader(jar) } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ json: input ?? null }) } : {}),
  });
  absorbSetCookie(jar ?? {}, res);
  const body = await res.json().catch(() => null);
  const data = body?.result?.data?.json;
  const error = body?.error?.json;
  return { status: res.status, data, error };
}

console.log(`\nSmoke contra ${BASE}\n`);

// ---------- 1. Static surface ----------
console.log("[1] Superficie estática");
{
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  const csp = res.headers.get("content-security-policy") ?? "";
  ok("GET / responde 200", res.status === 200);
  ok("título presente", html.includes("Unitec Familia"));
  ok("CSP presente", csp.includes("default-src 'self'"), csp.slice(0, 60));
  ok("noindex", (res.headers.get("x-robots-tag") ?? "").includes("noindex"));
  const frameOptions = res.headers.get("x-frame-options") ?? "";
  ok("anti-clickjacking", frameOptions.toUpperCase().includes("DENY") || csp.includes("frame-ancestors 'none'"), `x-frame-options: ${frameOptions || "(ninguno)"}`);
  const robots = await fetch(`${BASE}/robots.txt`);
  const body = await robots.text();
  ok("robots.txt bloquea indexación", robots.status === 200 && /disallow:\s*\//i.test(body));
}

// ---------- 2. Public API ----------
console.log("[2] API pública");
{
  const { data } = await trpc("ping");
  ok("ping", data?.ok === true);
  const { data: cfg } = await trpc("auth.publicConfig");
  ok("allow-list de dominios pública", Array.isArray(cfg?.allowedDomains) && cfg.allowedDomains.includes("unitecusadesign.com"));
}

// ---------- 3. Login + profile ----------
console.log("[3] Autenticación");
const jar = {};
let me = null;
{
  const { status, data, error } = await trpc("auth.login", { method: "POST", input: { email: EMAIL, password: PASSWORD }, jar });
  ok("login", status === 200 && !!data?.user, error?.message ?? `HTTP ${status}`);
  ok("cookie de sesión emitida", !!jar.unitec_session);
  me = data?.user ?? null;
  const { data: meData, error: meError } = await trpc("auth.me", { jar });
  ok("auth.me", meData?.id === me?.id, meError?.message);
  ok("cuenta activa", !meData?.disabledAt);
}

// ---------- 4. Feed + post lifecycle ----------
console.log("[4] Publicaciones");
let feedCount = 0;
{
  const { data: feed } = await trpc("community.feed", { jar });
  feedCount = Array.isArray(feed) ? feed.length : 0;
  ok("feed carga (≥ 6 sembradas)", feedCount >= 6, `llegaron ${feedCount}`);

  const sentinel = `[smoke ${new Date().toISOString()}] verificación automática`;
  const { data: created, error } = await trpc("community.createPost", {
    method: "POST",
    input: { body: sentinel, topic: "Motivation" },
    jar,
  });
  ok("crear publicación", !!created?.id, error?.message);

  const { data: liked } = await trpc("community.toggleLike", { method: "POST", input: { postId: created.id }, jar });
  ok("me gusta", liked?.liked === true);

  const { error: commentError } = await trpc("community.addComment", {
    method: "POST",
    input: { postId: created.id, body: "comentario del smoke" },
    jar,
  });
  ok("comentar", !commentError, commentError?.message);

  const { data: after } = await trpc("community.feed", { jar });
  const mine = (after ?? []).find((p) => p.id === created.id);
  ok("la publicación aparece en el feed", !!mine);
  ok("me gusta y comentario visibles", mine?.liked === true && mine?.likeCount === 1 && mine?.comments?.length === 1);

  const { error: delError } = await trpc("community.deletePost", { method: "POST", input: { postId: created.id }, jar });
  ok("eliminar publicación propia", !delError, delError?.message);
  const { data: afterDel } = await trpc("community.feed", { jar });
  ok("la publicación desapareció", !(afterDel ?? []).some((p) => p.id === created.id));
}

// ---------- 5. Assistant ----------
console.log("[5] Asistente de empresa");
{
  const { data, error } = await trpc("assistant.ask", {
    method: "POST",
    input: { question: "¿Qué tipo de productos ofrece UNITEC para interiores?" },
    jar,
  });
  ok("respuesta del asistente", (data?.answer ?? "").length > 40, error?.message ?? "respuesta vacía");
}

// ---------- 6. Media round-trip ----------
console.log("[6] Fotos y audios");
{
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const res = await fetch(`${BASE}/api/media`, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "x-media-type": "image/png",
      "x-media-name": encodeURIComponent("smoke.png"),
      "x-media-size": String(png.length),
      Cookie: cookieHeader(jar),
    },
    body: png,
  });
  const body = await res.json().catch(() => null);
  ok("subida vía /api/media", res.status === 200 && !!body?.key, `HTTP ${res.status} ${body?.error ?? ""}`);

  if (body?.key) {
    const { data: media } = await trpc("community.mediaUrl", { input: { key: body.key }, jar });
    ok("URL firmada emitida", !!media?.url);
    const file = await fetch(media.url);
    ok("lectura del objeto", file.status === 200 && (await file.arrayBuffer()).byteLength === png.length);

    const { error: delError } = await trpc("community.deleteFile", { method: "POST", input: { key: body.key }, jar });
    ok("eliminación de archivo propio", !delError, delError?.message);
    const { error: goneError } = await trpc("community.mediaUrl", { input: { key: body.key }, jar });
    ok("el archivo ya no se resuelve", !!goneError);
  }
}

// ---------- 7. Unauthenticated access ----------
console.log("[7] Acceso sin sesión");
{
  const { error } = await trpc("community.feed", {});
  ok("feed exige sesión", !!error);
  const res = await fetch(`${BASE}/api/media`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-media-type": "image/png" },
    body: "x",
  });
  ok("subida exige sesión", res.status === 401);
}

// ---------- 8. Admin: offboarding round-trip ----------
console.log("[8] Administración (bajas y altas)");
{
  const { data: users, error } = await trpc("admin.listUsers", { jar });
  ok("listado de usuarios (admin)", Array.isArray(users) && users.some((u) => u.id === me?.id), error?.message);

  // Fixed fixture account: created on the first run, re-used afterwards.
  const fixtureJar = {};
  let signUp = await trpc("auth.signUp", {
    method: "POST",
    input: { name: "Smoke Offboarding", email: OFFBOARD_EMAIL, password: OFFBOARD_PASSWORD },
    jar: fixtureJar,
  });
  if (signUp.error && /ya existe/i.test(signUp.error.message ?? "")) {
    signUp = { status: 200, data: { user: null }, error: null };
  }
  ok("cuenta de prueba lista", !signUp.error, signUp.error?.message);

  const fixture = await trpc("auth.login", { method: "POST", input: { email: OFFBOARD_EMAIL, password: OFFBOARD_PASSWORD }, jar: {} });
  const fixtureId = fixture.data?.user?.id;

  if (fixtureId) {
    const { error: disableError } = await trpc("admin.setUserDisabled", {
      method: "POST",
      input: { userId: fixtureId, disabled: true },
      jar,
    });
    ok("admin desactiva la cuenta", !disableError, disableError?.message);

    const blocked = await trpc("auth.login", { method: "POST", input: { email: OFFBOARD_EMAIL, password: OFFBOARD_PASSWORD }, jar: {} });
    ok("login bloqueado para cuenta desactivada", !!blocked.error && /desactivada/i.test(blocked.error.message ?? ""), blocked.error?.message);

    const { data: people } = await trpc("community.people", { jar });
    ok("la cuenta desaparece del directorio", !(people ?? []).some((p) => p.id === fixtureId));

    const { error: enableError } = await trpc("admin.setUserDisabled", {
      method: "POST",
      input: { userId: fixtureId, disabled: false },
      jar,
    });
    ok("admin reactiva la cuenta", !enableError, enableError?.message);
    const back = await trpc("auth.login", { method: "POST", input: { email: OFFBOARD_EMAIL, password: OFFBOARD_PASSWORD }, jar: {} });
    ok("login funciona tras reactivar", !!back.data?.user, back.error?.message);
  }
}

// ---------- 9. Rate limiting ----------
console.log("[9] Límite de intentos");
{
  let sawLimit = false;
  let lastMessage = "";
  for (let i = 0; i < 12; i++) {
    const { error } = await trpc("auth.login", {
      method: "POST",
      input: { email: OFFBOARD_EMAIL, password: "wrong-password-XXX" },
      jar: {},
    });
    lastMessage = error?.message ?? "";
    if (/demasiados intentos/i.test(lastMessage)) {
      sawLimit = true;
      break;
    }
  }
  ok("login repetido queda limitado", sawLimit, `último mensaje: ${lastMessage || "(sin error)"}`);
}

// ---------- 10. Logout ----------
console.log("[10] Cierre de sesión");
{
  const { error } = await trpc("auth.logout", { method: "POST", jar });
  ok("logout", !error, error?.message);
  const { error: meError } = await trpc("auth.me", { jar });
  ok("la sesión terminó", !!meError);
}

console.log(`\n${passed} pasaron, ${failed} fallaron${failed ? ":\n  - " + failures.join("\n  - ") : ""}\n`);
process.exit(failed ? 1 : 0);
