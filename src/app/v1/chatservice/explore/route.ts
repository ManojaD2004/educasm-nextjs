import { GPTService } from "@/app/services/gptService";
import { z } from "zod";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const chatServiceSchema = z.object({
  query: z.string(),
  userContext: z.object({
    age: z.number(),
  }),
});

export async function POST(req: Request) {
  try {
    const gptService = new GPTService();
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    console.log("IN");
    const reqJson = await req.json();
    const chatService = chatServiceSchema.parse(reqJson);
    const { systemPrompt, userPrompt } = gptService.streamExplorePrompts(
      chatService.query,
      chatService.userContext
    );
    const response = streamText({
      model: google("gemini-1.5-flash"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return response.toTextStreamResponse({
      headers: {
        "Content-Type": "text/event-stream",
      },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ data: null, error }, { status: 500 });
  }
}
