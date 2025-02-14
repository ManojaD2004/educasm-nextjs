import { GPTService } from "@/app/services/gptService";
import { z } from "zod";
// import { UserContext } from "@/app/types";

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
