// Entry for the Vercel Function. Bundled by build:api into dist/api/index.js —
// a single self-contained file, so nothing depends on Vercel's TypeScript
// handling (its Node builder only compiles TS inside the api/ directory).
import { handle } from "hono/vercel";
import app from "./app";

export default handle(app);
