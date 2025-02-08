import { Server } from "https://deno.land/x/faster@v12.1/mod.ts";
import staticRoutes from "./api/static.ts";

const server = new Server();

staticRoutes(server); // Put as last router!

await server.listen({ port: 8000 });
