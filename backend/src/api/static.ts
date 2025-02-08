import { Server, serveStatic, Context, NextFunc, redirect } from "https://deno.land/x/faster@v12.1/mod.ts";
import { lookup } from "https://deno.land/x/mrmime@v2.0.0/mod.ts";

export default function exampleRoutes(server: Server) {
	server.get("", redirect("/index.html"));
	server.get("/", redirect("/index.html"));

	server.get("/*", serveStatic("../frontend/dist"), async (ctx: Context, next: NextFunc) => {
		ctx.res.headers = new Headers({
			"content-type": lookup(ctx.req.url)!,
		});
		await next();
	});
}
