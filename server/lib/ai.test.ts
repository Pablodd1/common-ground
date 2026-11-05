import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { generateText } from "ai";

// Servidor falso con el formato de la API de DeepSeek (compatible con OpenAI).
const requests: { url: string; auth: string; body: Record<string, unknown> }[] = [];
let status = 200;
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    requests.push({ url: req.url ?? "", auth: String(req.headers.authorization), body: JSON.parse(raw) });
    res.writeHead(status, { "content-type": "application/json" });
    res.end(status === 200
      ? JSON.stringify({ id: "x", object: "chat.completion", created: 0, model: "deepseek-flash", choices: [{ index: 0, message: { role: "assistant", content: "Hola desde DeepSeek" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
      : JSON.stringify({ error: { message: "Insufficient Balance", type: "unknown_error" } }));
  });
});

let ai: typeof import("./ai");
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.DEEPSEEK_API_KEY = "sk-prueba";
  delete process.env.DEEPSEEK_MODEL;
  ai = await import("./ai");
});
afterAll(() => server.close());

describe("DeepSeek", () => {
  it("envía la solicitud con el formato de DeepSeek", async () => {
    const result = await generateText({ model: ai.deepseekModel(), system: "sistema", prompt: "pregunta", maxOutputTokens: 1000 });
    expect(result.text).toBe("Hola desde DeepSeek");
    const sent = requests.at(-1)!;
    expect(sent.url).toBe("/chat/completions");
    expect(sent.auth).toBe("Bearer sk-prueba");
    expect(sent.body.model).toBe("deepseek-flash");
    expect(sent.body.max_tokens).toBe(1000);
    expect(sent.body).not.toHaveProperty("max_completion_tokens");
  });

  it("sin saldo (402) muestra un aviso claro en español", async () => {
    status = 402;
    const error = await generateText({ model: ai.deepseekModel(), prompt: "pregunta", maxRetries: 0 }).catch((caught) => caught);
    const friendly = ai.friendlyAiError(error);
    expect(friendly.code).toBe("PRECONDITION_FAILED");
    expect(friendly.message).toContain("no tiene saldo");
  });
});
