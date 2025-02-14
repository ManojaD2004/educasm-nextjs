// src/services/api.ts
import { MessageTopic, MessgaeQuestion, Question, UserContext } from "../types";

const transformQuestion = (rawQuestion: Question): Question => ({
  text: rawQuestion.text,
  options: rawQuestion.options,
  correctAnswer: rawQuestion.correctAnswer,
  explanation: rawQuestion.explanation,
  difficulty: rawQuestion.difficulty,
  ageGroup: rawQuestion.ageGroup,
  topic: rawQuestion.topic,
  subtopic: rawQuestion.subtopic || "",
  questionType: rawQuestion.questionType || "conceptual",
});

export const api = {
  async getQuestion(
    topic: string,
    level: number,
    userContext: UserContext
  ): Promise<Question> {
    try {
      console.log(topic, level, userContext);
      const questionRes = await fetch("/v1/chatservice/playground", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, level, userContext }),
      });
      const questionJson = await questionRes.json();
      if (questionJson?.error !== null) {
        throw new Error("Error fetching APIs");
      }
      const question: Question = questionJson.data;
      return transformQuestion(question);
    } catch (error) {
      console.error("Question generation error:", error);
      throw new Error("Failed to generate question");
    }
  },
  async streamExploreContent(
    query: string,
    userContext: UserContext,
    onChunk: (content: {
      text?: string;
      topics?: any[];
      questions?: any[];
    }) => void
  ) {
    try {
      console.log(query, userContext);
      const res = await fetch("/v1/chatservice/explore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, userContext }),
      });
      const resReader = res.body?.getReader();
      if (!resReader) {
        throw new Error("Response body is not a readable stream.");
      }
      const chunkDecoder = new TextDecoder();
      let mainContent = "";
      let jsonContent = "";
      const currentTopics: MessageTopic[] = [];
      const currentQuestions: MessgaeQuestion[] = [];
      let isJsonSection = false;
      while (true) {
        const { done, value } = await resReader.read();
        if (done) {
          console.log("Stream complete.");
          break;
        }
        const content = chunkDecoder.decode(value, { stream: true });
        if (content.includes("---")) {
          isJsonSection = true;
          const stInd = content.indexOf("---");
          jsonContent += content.slice(stInd + 3);
          continue;
        }
        if (isJsonSection) {
          jsonContent += content;
          try {
            // Try to parse complete JSON objects
            const jsonStr = jsonContent.trim();
            if (jsonStr.startsWith("{") && jsonStr.endsWith("}")) {
              const parsed = JSON.parse(jsonStr);
              if (parsed.topics && Array.isArray(parsed.topics)) {
                parsed.topics.forEach((topic: any) => {
                  if (!currentTopics.some((t) => t.topic === topic.name)) {
                    currentTopics.push({
                      topic: topic.name,
                      type: topic.type,
                      reason: topic.detail,
                    });
                  }
                });
              }
              // Process questions if available
              if (parsed.questions && Array.isArray(parsed.questions)) {
                parsed.questions.forEach((question: any) => {
                  if (
                    !currentQuestions.some((q) => q.question === question.text)
                  ) {
                    currentQuestions.push({
                      question: question.text,
                      type: question.type,
                      context: question.detail,
                    });
                  }
                });
              }

              // Send update with current state
              onChunk({
                text: mainContent.trim(),
                topics: currentTopics.length > 0 ? currentTopics : undefined,
                questions:
                  currentQuestions.length > 0 ? currentQuestions : undefined,
              });
            }
          } catch (error) {
            // Continue accumulating if parsing fails
            console.debug("JSON parse error:", error);
          }
        } else {
          mainContent += content;
          onChunk({
            text: mainContent.trim(),
            topics: currentTopics.length > 0 ? currentTopics : undefined,
            questions:
              currentQuestions.length > 0 ? currentQuestions : undefined,
          });
        }
      }
    } catch (error) {
      console.error("Question generation error:", error);
      throw new Error("Failed to generate question");
    }
  },
};
