import { GPTService } from "@/app/services/gptService";
import { z } from "zod";
import { rateLimit } from "../../rateLimit";

const chatServiceSchema = z.object({
  topic: z.string(),
  level: z.number(),
  userContext: z.object({
    age: z.number(),
  }),
});

export async function POST(req: Request) {
  try {
    // console.log(req);
    const ip: string =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      (req as any).socket?.remoteAddress ||
      "Unknown IP";
    const rl = rateLimit(ip);
    if (rl.allow === false) {
      return Response.json({ data: null, error: rl.message }, { status: 429 });
    }
    const gptService = new GPTService();
    const reqJson = await req.json();
    const chatService = chatServiceSchema.parse(reqJson);
    const questions = await gptService.getPlaygroundQuestion(
      chatService.topic,
      chatService.level,
      chatService.userContext
    );
    console.log(chatService);
    return Response.json(
      { data: questions, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    return Response.json({ data: null, error }, { status: 500 });
  }
}
