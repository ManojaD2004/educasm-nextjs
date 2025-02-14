import { GPTService } from "@/app/services/gptService";
import { z } from "zod";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { rateLimit } from "../../rateLimit";

const chatServiceSchema = z.object({
  query: z.string(),
  userContext: z.object({
    age: z.number(),
  }),
  chatHistory: z.array(
    z.object({
      role: z.union([z.literal("assistant"), z.literal("user")]),
      content: z.string(),
    })
  ),
});

interface MessageHistory {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
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
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const reqJson = await req.json();
    const chatService = chatServiceSchema.parse(reqJson);
    // console.log(chatService);
    const { systemPrompt, userPrompt } = gptService.streamExplorePrompts(
      chatService.query,
      chatService.userContext
    );
    const chatHistory: MessageHistory[] = chatService.chatHistory;
    chatHistory.unshift({ role: "system", content: systemPrompt });
    chatHistory.push({ role: "user", content: userPrompt });
    // console.log(chatHistory);
    const response = streamText({
      model: google("gemini-1.5-flash"),
      messages: chatHistory,
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
