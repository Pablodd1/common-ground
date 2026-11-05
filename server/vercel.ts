// Entry for the Vercel Function. Bundled by build:api into api/index.js —
// a single self-contained file, so nothing depends on Vercel's TypeScript
// handling (its Node builder only compiles TS inside the api/ directory).
//
// Named-method exports (not `export default`) are deliberate: for prebuilt
// bundles the runtime cannot statically tell a modern fetch-style handler
// from a legacy (req, res) one, defaults to legacy, discards the returned
// Response and hangs the invocation. Named HTTP-method exports bypass that
// heuristic entirely.
import app from "./app";

async function handle(request: Request): Promise<Response> {
  return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
