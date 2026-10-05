import { resolve } from "node:path";
import type { Plugin } from "vite";
import { createApiHandler } from "./handler";
import { configDir, packageRoot } from "./paths";
import { registerWorkspace } from "./workspaces";

// Dev server: mount the shared API and register the repo being developed
// against — BASE_PATH (relative to this repo, or absolute) or this repo.
export function loopboardApi(options?: { basePath?: string }): Plugin {
  return {
    name: "loopboard-api",
    async configureServer(server) {
      const ctx = { configDir: configDir() };
      const target = resolve(packageRoot(), options?.basePath || ".");
      try {
        const workspace = await registerWorkspace(ctx.configDir, target);
        server.config.logger.info(`  loopboard workspace: ${workspace.id} → ${workspace.root}`);
      } catch (err) {
        server.config.logger.warn(`  loopboard: ${(err as Error).message}`);
      }
      const handle = createApiHandler(ctx);
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        void handle(req, res);
      });
    },
  };
}
