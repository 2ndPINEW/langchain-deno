import { MiddlewareHandlerContext } from "$fresh/server.ts";

interface State {
  data: string;
}

export async function handler(
  _req: Request,
  ctx: MiddlewareHandlerContext<State>
) {
  const resp = await ctx.next();
  resp.headers.append("Access-Control-Allow-Origin", "*");
  return resp;
}
