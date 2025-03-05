import { Server, setCORS } from "https://deno.land/x/faster@v12.1/mod.ts";
import staticRoutes from "./api/static.ts";
import projectManager from "./projects/projectManager.ts";
import { DisabledInDemoModeError } from "./api/error.ts";

const server = new Server();

server.useAtBeginning(async (ctx, next) => {
	await next();

	const error = ctx.error;

	if (error instanceof DisabledInDemoModeError) {
		ctx.res.status = 500;
		ctx.res.body = error.message;
		ctx.error = error.message;

		return;
	}

	if (error) {
		console.error(error);
	}
});

// Collect projects
await projectManager.collect();
await projectManager.routes(server);
await projectManager.args();

staticRoutes(server); // Put as last router!

// Capture exit
let exiting = false;

Deno.addSignalListener("SIGINT", async () => {
	if (exiting) {
		return;
	}

	exiting = true;

	console.log("[exit] Saving projects");
	await projectManager.exit();
	console.log("[exit] Done");
	Deno.exit(0);
});

// Start api
await server.listen({ port: 8000 });
