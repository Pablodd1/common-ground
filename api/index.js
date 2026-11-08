// Placeholder so Vercel's Git deployments can match the `functions` pattern in
// vercel.json BEFORE the build command runs (the pattern is validated against
// repository files at clone time; the real function is generated later).
//
// The deploy build (`npm run build:api`, esbuild bundling server/vercel.ts)
// OVERWRITES this file with the real handler. If this response ever reaches a
// user, the deployment skipped the build command — the 503 makes that loud.

async function placeholder() {
  return new Response(
    "api function placeholder: build:api did not run in this deployment",
    { status: 503 },
  );
}

export default placeholder;
export const GET = placeholder;
export const POST = placeholder;
export const PUT = placeholder;
export const PATCH = placeholder;
export const DELETE = placeholder;
export const HEAD = placeholder;
export const OPTIONS = placeholder;
