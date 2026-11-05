/**
 * Pruebas de integración contra un MySQL real.
 *
 * Se ejecutan solo si TEST_DATABASE_URL apunta a una base cuyo nombre termina en
 * "_test". La base se BORRA y se vuelve a crear con las migraciones del repositorio,
 * así que nunca uses aquí la base de producción.
 *
 *   TEST_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/unitec_test npm test
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import mysql from "mysql2/promise";

const testUrl = process.env.TEST_DATABASE_URL;
const dbName = testUrl ? new URL(testUrl).pathname.replace(/^\//, "") : "";
const enabled = Boolean(testUrl) && dbName.endsWith("_test");

// Vercel Blob no está disponible en pruebas: se simulan sus tres funciones.
vi.mock("@vercel/blob", () => ({
  issueSignedToken: vi.fn(async () => "signed-token"),
  presignUrl: vi.fn(async (_token: string, options: { pathname: string; operation: string }) => ({
    presignedUrl: `https://blob.test/${options.operation}/${options.pathname}`,
  })),
  head: vi.fn(async (key: string) => {
    if (key.includes("missing")) throw new Error("BlobNotFoundError");
    return { pathname: key, size: 100, contentType: key.endsWith(".webm") ? "audio/webm" : "image/png" };
  }),
}));

type Modules = {
  appRouter: typeof import("./router").appRouter;
  getDb: typeof import("./queries/connection").getDb;
  upsertUser: typeof import("./queries/users").upsertUser;
  schema: typeof import("@db/schema");
  eq: typeof import("drizzle-orm").eq;
};

let m: Modules;
type User = import("@db/schema").User;
let alice: User;
let bob: User;
let carol: User;
let admin: User;

function caller(user: User) {
  return m.appRouter.createCaller({ req: new Request("http://localhost/"), resHeaders: new Headers(), user });
}

async function upload(user: User, name: string) {
  const { key } = await caller(user).community.createUploadUrl({ name, contentType: name.endsWith(".webm") ? "audio/webm" : "image/png", size: 100 });
  await caller(user).community.completeUpload({ key, name, contentType: name.endsWith(".webm") ? "audio/webm" : "image/png", size: 100 });
  return key;
}

describe.skipIf(!enabled)("community router (MySQL)", () => {
  beforeAll(async () => {
    const server = new URL(testUrl!);
    server.pathname = "/";
    const root = await mysql.createConnection(server.toString());
    await root.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await root.query(`CREATE DATABASE \`${dbName}\``);
    await root.end();

    process.env.DATABASE_URL = testUrl;
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const migrationDb = drizzle(testUrl!);
    await migrate(migrationDb, { migrationsFolder: path.resolve(import.meta.dirname, "../db/migrations") });
    await migrationDb.$client.end();

    m = {
      appRouter: (await import("./router")).appRouter,
      getDb: (await import("./queries/connection")).getDb,
      upsertUser: (await import("./queries/users")).upsertUser,
      schema: await import("@db/schema"),
      eq: (await import("drizzle-orm")).eq,
    };
    const create = async (unionId: string, name: string, role: "user" | "admin" = "user") => {
      await m.upsertUser({ unionId, name, role });
      return (await m.getDb().query.users.findFirst({ where: m.eq(m.schema.users.unionId, unionId) }))!;
    };
    alice = await create("t:alice", "Alice");
    bob = await create("t:bob", "Bob");
    carol = await create("t:carol", "Carol");
    admin = await create("t:admin", "Admin", "admin");
  }, 120_000);

  it("las migraciones crean todas las tablas en una base nueva", async () => {
    const { sql } = await import("drizzle-orm");
    const [rows] = await m.getDb().execute(sql`SHOW TABLES`);
    const tables = (rows as unknown as Record<string, string>[]).map((row) => Object.values(row)[0]);
    expect(tables).toEqual(expect.arrayContaining([
      "assistantMessages", "comments", "companyResources", "conversations", "files", "likes", "messages", "posts", "users",
    ]));
  });

  it("iniciar sesión de nuevo no borra el nombre editado en el perfil", async () => {
    await caller(alice).community.updateProfile({
      name: "Alice Editada", jobTitle: "", department: "", location: "", bio: "", interests: [],
      birthday: "", startDate: "", shareBirthday: true, shareLocation: true, avatarKey: null,
    });
    await m.upsertUser({ unionId: "t:alice", name: "Alice (OAuth)", avatar: "https://a.test/x.png", lastSignInAt: new Date() });
    const me = await caller(alice).community.me();
    expect(me.name).toBe("Alice Editada");
    expect(me.avatar).toBe("https://a.test/x.png");
  });

  it("los adjuntos de mensajes directos solo los ven los participantes", async () => {
    const { id } = await caller(alice).community.openConversation({ personId: bob.id });
    const key = await upload(alice, "privada.png");
    await caller(alice).community.sendMessage({ conversationId: id, body: "", mediaKey: key });

    await expect(caller(alice).community.mediaUrl({ key })).resolves.toHaveProperty("url");
    await expect(caller(bob).community.mediaUrl({ key })).resolves.toHaveProperty("url");
    await expect(caller(carol).community.mediaUrl({ key })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("un archivo sin publicar solo lo ve quien lo subió; uno publicado lo ve todo el equipo", async () => {
    const key = await upload(alice, "borrador.png");
    await expect(caller(carol).community.mediaUrl({ key })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await caller(alice).community.createPost({ body: "", topic: "Wins", mediaKey: key });
    await expect(caller(carol).community.mediaUrl({ key })).resolves.toHaveProperty("url");
  });

  it("el tipo de archivo se toma del registro verificado, no del navegador", async () => {
    const key = await upload(bob, "voz.webm");
    await caller(bob).community.createPost({ body: "hola", topic: "Wins", mediaKey: key, mediaType: "image/png" });
    const post = (await caller(bob).community.feed()).find((item) => item.mediaKey === key)!;
    expect(post.mediaType).toBe("audio/webm");
  });

  it("no se puede compartir un archivo ajeno", async () => {
    const key = await upload(alice, "ajeno.png");
    await expect(caller(bob).community.createPost({ body: "", topic: "Wins", mediaKey: key }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("completeUpload responde con un error claro si el archivo no llegó a Blob", async () => {
    await expect(caller(alice).community.completeUpload({
      key: `u/${alice.id}/1-missing.png`, name: "missing.png", contentType: "image/png", size: 100,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("una conversación larga muestra los 200 mensajes más recientes en orden", async () => {
    const { id } = await caller(carol).community.openConversation({ personId: bob.id });
    await m.getDb().insert(m.schema.messages).values(Array.from({ length: 205 }, (_, index) => ({
      conversationId: id, senderId: carol.id, body: `m${index}`,
    })));
    const rows = await caller(bob).community.messages({ conversationId: id });
    expect(rows).toHaveLength(200);
    expect(rows[0].body).toBe("m5");
    expect(rows.at(-1)!.body).toBe("m204");

    const list = await caller(bob).community.conversations();
    expect(list.find((item) => item.id === id)?.lastMessage?.body).toBe("m204");
    expect(list.find((item) => item.id === id)?.other?.name).toBe("Carol");
  });

  it("abrir la misma conversación a la vez no crea duplicados ni errores", async () => {
    const results = await Promise.all([
      caller(admin).community.openConversation({ personId: carol.id }),
      caller(carol).community.openConversation({ personId: admin.id }),
      caller(admin).community.openConversation({ personId: carol.id }),
    ]);
    expect(new Set(results.map((item) => item.id)).size).toBe(1);
  });

  it("me gusta: conteo, estado propio y doble clic simultáneo", async () => {
    const { id } = await caller(carol).community.createPost({ body: "¿Café?", topic: "Questions" });
    await Promise.all([
      caller(alice).community.toggleLike({ postId: id }),
      caller(alice).community.toggleLike({ postId: id }),
    ]);
    await caller(bob).community.toggleLike({ postId: id });
    const forBob = (await caller(bob).community.feed()).find((post) => post.id === id)!;
    const forCarol = (await caller(carol).community.feed()).find((post) => post.id === id)!;
    expect(forBob.liked).toBe(true);
    expect(forCarol.liked).toBe(false);
    expect(forBob.likeCount).toBeGreaterThanOrEqual(1);
    expect(forBob.likeCount).toBeLessThanOrEqual(2);
  });

  it("no se puede responder ni dar me gusta a una publicación inexistente", async () => {
    await expect(caller(alice).community.addComment({ postId: 999_999, body: "hola" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(alice).community.toggleLike({ postId: 999_999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("eliminar publicaciones y respuestas: autor o administrador", async () => {
    const { id } = await caller(alice).community.createPost({ body: "Para borrar", topic: "Motivation" });
    await caller(bob).community.addComment({ postId: id, body: "Respuesta de Bob" });
    await caller(carol).community.toggleLike({ postId: id });

    const post = (await caller(bob).community.feed()).find((item) => item.id === id)!;
    expect(post.canDelete).toBe(false);
    expect(post.comments[0].canDelete).toBe(true);
    await expect(caller(bob).community.deletePost({ postId: id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(carol).community.deleteComment({ commentId: post.comments[0].id })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await caller(admin).community.deletePost({ postId: id });
    expect((await caller(alice).community.feed()).some((item) => item.id === id)).toBe(false);
    const orphanComments = await m.getDb().select().from(m.schema.comments).where(m.eq(m.schema.comments.postId, id));
    const orphanLikes = await m.getDb().select().from(m.schema.likes).where(m.eq(m.schema.likes.postId, id));
    expect(orphanComments).toHaveLength(0);
    expect(orphanLikes).toHaveLength(0);
  });

  it("la foto de perfil debe ser una imagen", async () => {
    const key = await upload(carol, "audio.webm");
    await expect(caller(carol).community.updateProfile({
      name: "Carol", jobTitle: "", department: "", location: "", bio: "", interests: [],
      birthday: "", startDate: "", shareBirthday: true, shareLocation: true, avatarKey: key,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("el historial del asistente conserva el orden pregunta → respuesta", async () => {
    await m.getDb().insert(m.schema.assistantMessages).values([
      { userId: bob.id, role: "user", body: "pregunta", sources: [] },
      { userId: bob.id, role: "assistant", body: "respuesta", sources: [] },
    ]);
    const history = await caller(bob).assistant.history();
    expect(history.map((row) => row.role)).toEqual(["user", "assistant"]);
  });
});
