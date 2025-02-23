import { Context, NextFunc, Server } from "https://deno.land/x/faster@v12.1/mod.ts";

class ServerSendEventsManager {
	buildRoute(server: Server) {
		server.get("/sse", async (ctx: Context, next: NextFunc) => {
			const headers = new Headers({
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			});

			const body = new ReadableStream({
				start(controller) {
					const encoder = new TextEncoder();

					const sendEvent = (data: string) => {
						controller.enqueue(encoder.encode(`data: ${data}\n\n`));
					};

					const intervalId = setInterval(() => {
						sendEvent(
							JSON.stringify({ message: "Hello, world!", timestamp: new Date().toISOString() })
						);
					}, 1000);
				},
			});

			ctx.res = new Response(body, { headers });
			await next();
		});
	}

	publish() {}
}
