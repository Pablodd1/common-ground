// Entry for the Vercel Function. Bundled by build:api into api/index.js —
// a single self-contained file, so nothing depends on Vercel's TypeScript
// handling (its Node builder only compiles TS inside the api/ directory).
import app from "./app";

// Explicitly arity-1 and async: Vercel's runtime distinguishes the modern
// Web-fetch handler style from the legacy (req, res) style partly by the
// exported function's shape — hono's own `handle(app)` gets mis-detected as
// legacy, its Response is ignored, and the invocation times out.
export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request);
}
