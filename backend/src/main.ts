import { Server, setCORS } from "https://deno.land/x/faster@v12.1/mod.ts";
import staticRoutes from "./api/static.ts";
import projectManager from "./projects/projectManager.ts";

const server = new Server();

server.useAtBeginning(async (ctx, next) => {
	await next();

	const error = ctx.error;

	if (error) {
		console.error(error);
	}
});

// Collect projects
projectManager.collect();
projectManager.routes(server);

globalThis.addEventListener("unload", async () => {});

Deno.addSignalListener("SIGINT", async () => {
	console.log("[exit] Saving projects");
	await projectManager.exit();
	console.log("[exit] Done");
	Deno.exit(0);
});

staticRoutes(server); // Put as last router!

await server.listen({ port: 8000 });
