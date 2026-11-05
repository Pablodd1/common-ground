import { serve } from "@hono/node-server";
import app from "./app";
import { log } from "./lib/logger";
import { serveStaticFiles } from "./lib/vite";

serveStaticFiles(app);

const port = parseInt(process.env.PORT || "3000", 10);
serve({ fetch: app.fetch, port }, () => {
  log.info(`Server running on http://localhost:${port}/`);
});
