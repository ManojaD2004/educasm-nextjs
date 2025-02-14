import { rateLimit } from "../rateLimit";

export async function GET(req: Request) {
  const ip: string =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    (req as any).socket?.remoteAddress ||
    "Unknown IP";
  const rl = rateLimit(ip);
  if (rl.allow === false) {
    return Response.json({ data: null, error: rl.message }, { status: 429 });
  }
  return Response.json({ hello: "Hello Tiger!" });
}
