const pptxgen = require("pptxgenjs");

// Palette — derived from the app's own mint/forest-green brand
const BG_LIGHT = "F2FAF5";
const BG_DARK = "0E2A22";
const PRIMARY = "156B4F";
const PRIMARY_SOFT = "DCEFE6";
const ACCENT = "E8A13D";
const TEXT = "13241E";
const MUTED = "5C7268";
const WHITE = "FFFFFF";
const F = "Arial";

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.author = "Unitec Familia";
p.title = "Unitec Familia — Services / Servicios";
const W = 13.33, H = 7.5, M = 0.6;

const chip = (s, x, y, w, text, opts = {}) => {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.44, rectRadius: 0.22, fill: { color: opts.fill || PRIMARY_SOFT }, line: { type: "none" } });
  s.addText(text, { x, y, w, h: 0.44, align: "center", valign: "middle", fontSize: opts.size || 12, bold: true, color: opts.color || PRIMARY, fontFace: F, margin: 0 });
};
const langHeads = (s, y) => {
  chip(s, M, y, 0.62, "EN", { fill: BG_DARK, color: WHITE });
  chip(s, W / 2 + 0.25, y, 0.62, "ES", { fill: ACCENT, color: TEXT });
};
const title = (s, en, es, dark) => {
  s.addText(en, { x: M, y: 0.42, w: W - 2 * M, h: 0.5, fontSize: 28, bold: true, color: dark ? WHITE : PRIMARY, fontFace: F, margin: 0 });
  if (es) s.addText(es, { x: M, y: 0.92, w: W - 2 * M, h: 0.34, fontSize: 13, italic: true, color: dark ? "A9C7BB" : MUTED, fontFace: F, margin: 0 });
};

/* ---------- 1 · Cover ---------- */
let s = p.addSlide();
s.background = { color: BG_DARK };
s.addShape(p.shapes.OVAL, { x: 9.4, y: -1.6, w: 5.4, h: 5.4, fill: { color: PRIMARY, transparency: 55 }, line: { type: "none" } });
s.addShape(p.shapes.OVAL, { x: 11.2, y: 4.9, w: 3.6, h: 3.6, fill: { color: ACCENT, transparency: 70 }, line: { type: "none" } });
s.addText("Unitec Familia", { x: M, y: 2.1, w: 10.5, h: 1.1, fontSize: 60, bold: true, color: WHITE, fontFace: F, margin: 0 });
s.addText([
  { text: "Your company's private community — live today", options: { breakLine: true, color: "D9EDE4", fontSize: 20 } },
  { text: "La comunidad privada de tu empresa — en vivo hoy", options: { color: "A9C7BB", fontSize: 20 } },
], { x: M, y: 3.35, w: 11, h: 1.3, fontFace: F, margin: 0, paraSpaceAfter: 6 });
s.addText("common-ground-rust.vercel.app", { x: M, y: 6.55, w: 6, h: 0.4, fontSize: 14, bold: true, color: ACCENT, fontFace: F, margin: 0 });

/* ---------- 2 · What it is ---------- */
s = p.addSlide();
s.background = { color: BG_LIGHT };
title(s, "One private space for the whole team", "Un solo espacio privado para todo el equipo");
langHeads(s, 1.5);
s.addText("A private social network for your staff: posts, photos, voice notes, birthdays, people directory and an AI company assistant — all behind a company-only login.", { x: M, y: 2.15, w: W / 2 - M - 0.25, h: 2.1, fontSize: 15, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
s.addText("Una red social privada para tu personal: publicaciones, fotos, notas de voz, cumpleaños, directorio y un asistente de empresa con IA — todo tras un ingreso solo para la empresa.", { x: W / 2 + 0.25, y: 2.15, w: W / 2 - M - 0.25, h: 2.1, fontSize: 15, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
const feats = [
  ["Community · Comunidad", "Posts, photos & voice notes / Fotos y notas de voz"],
  ["Company hub · Empresa", "AI assistant, manual & courses / Asistente IA y formación"],
  ["Celebrations · Celebraciones", "Birthdays & anniversaries / Cumpleaños y aniversarios"],
];
feats.forEach((f, i) => {
  const x = M + i * ((W - 2 * M - 0.8) / 3 + 0.4);
  const w = (W - 2 * M - 0.8) / 3;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 4.7, w, h: 1.55, rectRadius: 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: { type: "outer", color: "0E2A22", blur: 8, offset: 2, angle: 90, opacity: 0.12 } });
  s.addText(f[0], { x: x + 0.25, y: 4.95, w: w - 0.5, h: 0.4, fontSize: 15, bold: true, color: PRIMARY, fontFace: F, margin: 0 });
  s.addText(f[1], { x: x + 0.25, y: 5.38, w: w - 0.5, h: 0.7, fontSize: 12, color: MUTED, fontFace: F, margin: 0 });
});

/* ---------- 3 · Mentions ---------- */
s = p.addSlide();
s.background = { color: BG_LIGHT };
title(s, "@Mentions that actually reach people", "Menciones @ que realmente llegan");
langHeads(s, 1.5);
const boxY = 2.5, boxH = 1.05;
const mk = (x, w, head, sub, fill, headColor, subColor) => {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: boxY, w, h: boxH, rectRadius: 0.1, fill: { color: fill || WHITE }, line: fill === PRIMARY_SOFT ? { type: "none" } : { color: "CBDFD4", width: 1 } });
  s.addText(head, { x, y: boxY + 0.12, w, h: 0.42, align: "center", fontSize: 14, bold: true, color: headColor || PRIMARY, fontFace: F, margin: 0 });
  s.addText(sub, { x, y: boxY + 0.52, w, h: 0.4, align: "center", fontSize: 11, color: subColor || MUTED, fontFace: F, margin: 0 });
};
mk(M, 3.4, '"Great job @maria!"', "Type @ and pick / Escribe @ y elige", PRIMARY_SOFT);
s.addShape(p.shapes.LINE, { x: M + 3.4, y: boxY + boxH / 2, w: 0.7, h: 0, line: { color: PRIMARY, width: 2.5, endArrowType: "triangle" } });
mk(M + 4.1, 2.5, "Notification engine", "Fail-safe / A prueba de fallos", WHITE);
s.addShape(p.shapes.LINE, { x: M + 6.6, y: boxY + boxH / 2, w: 0.7, h: 0, line: { color: PRIMARY, width: 2.5, endArrowType: "triangle" } });
const ch = [["In-app bell", "Campana"], ["Telegram", "instant"], ["Email", "Correo"]];
const chW = 1.62, chGap = 0.14, chStart = W - M - (3 * chW + 2 * chGap);
ch.forEach((c, i) => mk(chStart + i * (chW + chGap), chW, c[0], c[1], i === 0 ? PRIMARY : WHITE, i === 0 ? WHITE : PRIMARY, i === 0 ? "CFE8DC" : MUTED));
s.addText("Each employee has a unique @handle and chooses their own channels. Nothing to install: Telegram connects with one tap from the profile.", { x: M, y: 4.35, w: W / 2 - M - 0.25, h: 1.8, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
s.addText("Cada empleado tiene su @usuario único y elige sus canales. Sin instalar nada: Telegram se conecta con un toque desde el perfil.", { x: W / 2 + 0.25, y: 4.35, w: W / 2 - M - 0.25, h: 1.8, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });

/* ---------- 4 · Tickets ---------- */
s = p.addSlide();
s.background = { color: BG_LIGHT };
title(s, "/ticket — every issue finds its owner", "/ticket — cada problema llega a su responsable");
langHeads(s, 1.5);
const steps = [
  ["1", "Staff types /ticket + the issue", "Escriben /ticket con el problema"],
  ["2", "Admin inbox + owner alert", "Bandeja del admin y aviso al dueño"],
  ["3", "Telegram + email to the owner", "Telegram y correo al responsable"],
  ["4", "Resolved, staff notified", "Resuelto, se avisa al equipo"],
];
steps.forEach((st, i) => {
  const w = 2.75, x = M + i * (w + 0.42);
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.45, w, h: 1.9, rectRadius: 0.12, fill: { color: i === 3 ? PRIMARY : WHITE }, line: { type: "none" }, shadow: { type: "outer", color: "0E2A22", blur: 8, offset: 2, angle: 90, opacity: 0.12 } });
  s.addText(st[0], { x: x + 0.2, y: 2.6, w: 0.8, h: 0.5, fontSize: 26, bold: true, color: i === 3 ? "BFE3D3" : ACCENT, fontFace: F, margin: 0 });
  s.addText(st[1], { x: x + 0.2, y: 3.12, w: w - 0.4, h: 0.72, fontSize: 12.5, bold: true, color: i === 3 ? WHITE : TEXT, fontFace: F, margin: 0 });
  s.addText(st[2], { x: x + 0.2, y: 3.86, w: w - 0.4, h: 0.45, fontSize: 10.5, italic: true, color: i === 3 ? "BFE3D3" : MUTED, fontFace: F, margin: 0 });
  if (i < 3) s.addShape(p.shapes.LINE, { x: x + w, y: 3.4, w: 0.42, h: 0, line: { color: PRIMARY, width: 2.5, endArrowType: "triangle" } });
});
s.addText("Anyone can open a ticket from the same box they post in. Management sees it in seconds — no phone calls, no lost WhatsApp messages.", { x: M, y: 4.85, w: W / 2 - M - 0.25, h: 1.5, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
s.addText("Cualquiera abre un ticket desde el mismo cuadro donde publica. La gerencia lo ve en segundos — sin llamadas ni mensajes perdidos de WhatsApp.", { x: W / 2 + 0.25, y: 4.85, w: W / 2 - M - 0.25, h: 1.5, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });

/* ---------- 5 · Assistant ---------- */
s = p.addSlide();
s.background = { color: BG_LIGHT };
title(s, "An AI assistant that only tells the truth", "Un asistente con IA que solo dice la verdad");
langHeads(s, 1.5);
s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.2, w: 6.8, h: 2.6, rectRadius: 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: { type: "outer", color: "0E2A22", blur: 8, offset: 2, angle: 90, opacity: 0.12 } });
s.addText('"What is the difference between FOB and CIF?"', { x: M + 0.3, y: 2.42, w: 6.2, h: 0.45, fontSize: 15, bold: true, color: TEXT, fontFace: F, margin: 0 });
s.addText("FOB: buyer owns the cargo from the origin port. CIF: seller covers cost, insurance and freight to destination. (Source: company manual, Nov 2026)", { x: M + 0.3, y: 2.95, w: 6.2, h: 1.0, fontSize: 13, color: PRIMARY, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
s.addText('"¿Diferencia entre FOB y CIF?" — misma respuesta, en español, con fuente citada.', { x: M + 0.3, y: 4.0, w: 6.2, h: 0.6, fontSize: 12, italic: true, color: MUTED, fontFace: F, margin: 0 });
const guards = [["Grounded", "Only published sources / Solo fuentes publicadas"], ["Cited", "Every answer cites its source / Cita su fuente"], ["Honest", "If it does not know, it says so / Si no sabe, lo dice"]];
guards.forEach((g, i) => {
  const y = 2.2 + i * 0.92;
  chip(s, 8.1, y, 1.5, g[0], { fill: BG_DARK, color: WHITE, size: 11 });
  s.addText(g[1], { x: 9.75, y: y - 0.02, w: 3.1, h: 0.55, fontSize: 11.5, color: TEXT, fontFace: F, margin: 0, valign: "middle" });
});
s.addText("Admins publish the manual, courses, contacts and documents; the assistant answers only from what is published — in English or Spanish.", { x: M, y: 5.15, w: W / 2 - M - 0.25, h: 1.3, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
s.addText("Los administradores publican manual, cursos, contactos y documentos; el asistente responde solo con lo publicado — en inglés o español.", { x: W / 2 + 0.25, y: 5.15, w: W / 2 - M - 0.25, h: 1.3, fontSize: 14, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });

/* ---------- 6 · Trust ---------- */
s = p.addSlide();
s.background = { color: BG_DARK };
title(s, "Enterprise-grade from day one", "Nivel empresarial desde el día uno", true);
const stats = [
  ["9/9", "tables locked down (RLS)", "tablas blindadas (RLS)"],
  ["48", "automated checks, every 6 h", "chequeos automáticos cada 6 h"],
  ["90d", "verified weekly backups", "respaldos semanales verificados"],
  ["0", "pages indexed by search engines", "páginas indexadas por buscadores"],
];
stats.forEach((st, i) => {
  const w = (W - 2 * M - 1.2) / 4, x = M + i * (w + 0.4);
  s.addText(st[0], { x, y: 2.3, w, h: 1.3, fontSize: 66, bold: true, color: ACCENT, fontFace: F, margin: 0 });
  s.addText(st[1], { x, y: 3.7, w, h: 0.75, fontSize: 13.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
  s.addText(st[2], { x, y: 4.45, w, h: 0.6, fontSize: 11.5, italic: true, color: "A9C7BB", fontFace: F, margin: 0 });
});
s.addText("Company-only accounts · rate-limited logins · private media with expiring links · admin offboarding", { x: M, y: 5.9, w: W - 2 * M, h: 0.5, fontSize: 13, color: "D9EDE4", fontFace: F, margin: 0 });
s.addText("Cuentas solo de la empresa · límite de intentos de ingreso · medios privados con enlaces que expiran · bajas por el admin", { x: M, y: 6.35, w: W - 2 * M, h: 0.5, fontSize: 12, italic: true, color: "A9C7BB", fontFace: F, margin: 0 });

/* ---------- 7 · Benefits ---------- */
s = p.addSlide();
s.background = { color: BG_LIGHT };
title(s, "What your company and your clients gain", "Qué gana tu empresa y tus clientes");
langHeads(s, 1.5);
const rows = [
  ["For the company · Para la empresa", [
    "Closer team across locations / Equipo más unido entre sedes",
    "Nothing lost: tickets reach management / Los tickets llegan a gerencia",
    "Onboarding & training in one place / Inducción y formación en un lugar",
  ]],
  ["For your clients · Para tus clientes", [
    "Faster answers, fewer errors / Respuestas más rápidas, menos errores",
    "A team that knows each other serves better / Un equipo que se conoce atiende mejor",
    "Issues fixed before they escalate / Problemas resueltos antes de crecer",
  ]],
];
rows.forEach((col, i) => {
  const x = i === 0 ? M : W / 2 + 0.25, w = W / 2 - M - 0.25;
  s.addText(col[0], { x, y: 2.1, w, h: 0.45, fontSize: 16, bold: true, color: PRIMARY, fontFace: F, margin: 0 });
  col[1].forEach((line, j) => {
    const y = 2.75 + j * 1.05;
    s.addShape(p.shapes.OVAL, { x, y: y + 0.06, w: 0.16, h: 0.16, fill: { color: ACCENT }, line: { type: "none" } });
    s.addText(line, { x: x + 0.35, y: y - 0.08, w: w - 0.35, h: 0.85, fontSize: 14.5, color: TEXT, fontFace: F, margin: 0, lineSpacingMultiple: 1.1 });
  });
});

/* ---------- 8 · Close / demo ---------- */
s = p.addSlide();
s.background = { color: BG_DARK };
s.addShape(p.shapes.OVAL, { x: -1.8, y: 4.3, w: 5.2, h: 5.2, fill: { color: PRIMARY, transparency: 55 }, line: { type: "none" } });
s.addText("See it live · Velo en vivo", { x: M, y: 1.7, w: 10, h: 0.9, fontSize: 44, bold: true, color: WHITE, fontFace: F, margin: 0 });
s.addText("common-ground-rust.vercel.app", { x: M, y: 2.75, w: 9, h: 0.6, fontSize: 26, bold: true, color: ACCENT, fontFace: F, margin: 0 });
s.addText([
  { text: "Demo account · Cuenta demo: demo@unitecusadesign.com · UnitecDemo-2026!", options: { breakLine: true, color: "D9EDE4", fontSize: 15 } },
  { text: "Try it: type @ to mention someone, or /ticket with a message.", options: { breakLine: true, color: "D9EDE4", fontSize: 15 } },
  { text: "Pruébalo: escribe @ para mencionar a alguien, o /ticket con un mensaje.", options: { color: "A9C7BB", fontSize: 15 } },
], { x: M, y: 3.9, w: 11.5, h: 1.9, fontFace: F, margin: 0, paraSpaceAfter: 8 });
s.addText("Unitec Familia · private by design · privado por diseño", { x: M, y: 6.6, w: 9, h: 0.4, fontSize: 12, italic: true, color: "A9C7BB", fontFace: F, margin: 0 });

p.writeFile({ fileName: "Unitec-Familia-Services.pptx" }).then(() => console.log("deck written"));
