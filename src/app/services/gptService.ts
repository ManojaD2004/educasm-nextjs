import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question, UserContext } from "../types";

export class GPTService {
  private gemini: GoogleGenerativeAI;

  constructor() {
    // console.log(process.env.GEMINI_API_KEY);
    this.gemini = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || "Need Api Key"
    );
  }

  private async makeRequest(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number = 2000
  ) {
    try {
      const model = this.gemini.getGenerativeModel({
        model: "gemini-1.5-flash",
      });
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt} Provide your response in JSON format.` },
            ],
          },
          // {
          //   role: "model",
          //   parts: [
          //     { text: `OK I am ready for your queries.` },
          //   ],
          // },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      });
      const result = await chat.sendMessage(userPrompt);
      return result.response.text() || "";
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error("Failed to generate content");
    }
  }

  private validateQuestionFormat(question: Question): boolean {
    try {
      // Basic validation
      if (!question.text?.trim()) return false;
      if (!Array.isArray(question.options) || question.options.length !== 4)
        return false;
      if (question.options.some((opt) => !opt?.trim())) return false;
      if (
        typeof question.correctAnswer !== "number" ||
        question.correctAnswer < 0 ||
        question.correctAnswer > 3
      )
        return false;

      // Explanation validation
      if (
        !question.explanation?.correct?.trim() ||
        !question.explanation?.key_point?.trim()
      )
        return false;

      // Additional validation
      if (question.text.length < 10) return false; // Too short
      if (question.options.length !== new Set(question.options).size)
        return false; // Duplicates
      if (
        question.explanation.correct.length < 5 ||
        question.explanation.key_point.length < 5
      )
        return false; // Too short explanations

      return true;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  }

  async getPlaygroundQuestion(
    topic: string,
    level: number,
    userContext: UserContext
  ): Promise<Question> {
    try {
      const aspects = [
        "core_concepts",
        "applications",
        "problem_solving",
        "analysis",
        "current_trends",
      ];

      // Randomly select an aspect to focus on
      const selectedAspect =
        aspects[Math.floor(Math.random() * aspects.length)];

      const systemPrompt = `Generate a UNIQUE multiple-choice question about ${topic}.
        Focus on: ${selectedAspect.replace("_", " ")}

        Return in this JSON format:
        {
          "text": "question text here",
          "options": ["option A", "option B", "option C", "option D"],
          "correctAnswer": RANDOMLY_PICKED_NUMBER_0_TO_3,
          "explanation": {
            "correct": "Brief explanation of why the correct answer is right (max 15 words)",
            "key_point": "One key concept to remember (max 10 words)"
          },
          "difficulty": ${level},
          "topic": "${topic}",
          "subtopic": "specific subtopic",
          "questionType": "conceptual",
          "ageGroup": "${userContext.age}"
        }

        IMPORTANT RULES FOR UNIQUENESS:
        1. For ${topic}, based on selected aspect:
           - core_concepts: Focus on fundamental principles and theories
           - applications: Focus on real-world use cases and implementations
           - problem_solving: Present a scenario that needs solution
           - analysis: Compare different approaches or technologies
           - current_trends: Focus on recent developments and future directions

        2. Question Variety:
           - NEVER use the same question pattern twice
           - Mix theoretical and practical aspects
           - Include industry-specific examples
           - Use different question formats (what/why/how/compare)
           - Incorporate current developments in ${topic}

        3. Answer Choices:
           - Make ALL options equally plausible
           - Randomly assign the correct answer (0-3)
           - Ensure options are distinct but related
           - Include common misconceptions
           - Make wrong options educational

        4. Format Requirements:
           - Question must be detailed and specific
           - Each option must be substantive
           - Explanation must cover why correct answer is right AND why others are wrong
           - Include real-world context where possible
           - Use age-appropriate language

        ENSURE HIGH ENTROPY:
        - Randomize question patterns
        - Vary difficulty within level ${level}
        - Mix theoretical and practical aspects
        - Use different companies/technologies as examples
        - Include various ${topic} scenarios

        EXPLANATION GUIDELINES:
        - Keep explanations extremely concise and clear
        - Focus on the most important point only
        - Use simple language
        - Highlight the key concept
        - No redundant information
        - Maximum 25 words total`;

      const userPrompt = `Create a completely unique ${level}/10 difficulty question about ${topic}.
        Focus on ${selectedAspect.replace("_", " ")}.
        Ensure the correct answer is randomly placed.
        Make it engaging for a ${userContext.age} year old student.
        Use current examples and trends.`;

      const content = await this.makeRequest(systemPrompt, userPrompt, 1500);
      // console.log(content);
      if (!content) {
        throw new Error("Empty response received");
      }

      let parsedContent: Question;
      try {
        const startInd = content.indexOf("```json");
        if (startInd === -1) {
          throw new Error("Invalid JSON response");
        }
        const endInd = content.indexOf("```", startInd + 7);
        if (endInd === -1) {
          throw new Error("Invalid JSON response");
        }
        const trimContent = content.slice(startInd + 7, endInd - 1);
        parsedContent = JSON.parse(trimContent);
        // console.log(parsedContent);
      } catch (error) {
        console.error("JSON Parse Error:", error);
        throw new Error("Invalid JSON response");
      }

      // Randomly shuffle the options and adjust correctAnswer accordingly
      const shuffled = this.shuffleOptionsAndAnswer(parsedContent);

      // Validate and format the question
      const formattedQuestion: Question = {
        text: shuffled.text || "",
        options: shuffled.options,
        correctAnswer: shuffled.correctAnswer,
        explanation: {
          correct:
            shuffled.explanation?.correct || "Correct answer explanation",
          key_point: shuffled.explanation?.key_point || "Key learning point",
        },
        difficulty: level,
        topic: topic,
        subtopic: parsedContent.subtopic || topic,
        questionType: "conceptual",
        ageGroup: userContext.age.toString(),
      };

      if (this.validateQuestionFormat(formattedQuestion)) {
        // Remove Option Head
        for (let i = 0; i < formattedQuestion.options.length; i++) {
          const option = formattedQuestion.options[i].trim();
          if (
            option.startsWith("A.") ||
            option.startsWith("B.") ||
            option.startsWith("C.") ||
            option.startsWith("D.")
          ) {
            const removeOptionHead = option.slice(2);
            formattedQuestion.options[i] = removeOptionHead.trim();
          } else {
            formattedQuestion.options[i] = option;
          }
        }
        return formattedQuestion;
      }

      throw new Error("Generated question failed validation");
    } catch (error) {
      console.error("Question generation error:", error);
      throw new Error("Failed to generate valid question");
    }
  }

  private shuffleOptionsAndAnswer(question: Question): Question {
    // Create array of option objects with original index
    const optionsWithIndex = question.options.map((opt, idx) => ({
      text: opt,
      isCorrect: idx === question.correctAnswer,
    }));

    // Shuffle the options
    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsWithIndex[i], optionsWithIndex[j]] = [
        optionsWithIndex[j],
        optionsWithIndex[i],
      ];
    }

    // Find new index of correct answer
    const newCorrectAnswer = optionsWithIndex.findIndex((opt) => opt.isCorrect);

    return {
      ...question,
      options: optionsWithIndex.map((opt) => opt.text),
      correctAnswer: newCorrectAnswer,
    };
  }

  async streamExploreContent(
    query: string,
    userContext: UserContext,
    onChunk: (content: {
      text?: string;
      topics?: any[];
      questions?: any[];
    }) => void
  ): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const systemPrompt = `You are a Gen-Z tutor who explains complex topics concisely for a ${userContext.age} year old.
          First provide the explanation in plain text, then provide related content in a STRICT single-line JSON format.
          
          Structure your response exactly like this:
          
          <paragraph 1>

          <paragraph 2>

          <paragraph 3>

          ---
          {"topics":[{"name":"Topic","type":"prerequisite","detail":"Why"}],"questions":[{"text":"Q?","type":"curiosity","detail":"Context"}]}

          RULES:
          - ADAPT CONTENT FOR ${userContext.age} YEAR OLD:
            
            * Match complexity of explanation to age level
            
          - STRICT LENGTH LIMITS:
            * Total explanation must be 60-80 words maximum
            * Each paragraph around 20-25 words each
            * Related questions maximum 12 words each
            * Topic details 1-2 words each
          - Keep paragraphs clear and simple
          - Third paragraph should directly state applications and facts without phrases like "In real-world applications"
          - Use "---" as separator
          - JSON must be in a single line
          - No line breaks in JSON
          - MUST provide EXACTLY 5 related topics and 5 questions
          - Related questions must be:
            * Curiosity-driven and thought-provoking
            * STRICTLY 8-12 words maximum
            * Focus on mind-blowing facts or surprising connections
            * Make users think "Wow, I never thought about that!"
          - Related topics must be:
            * Directly relevant to understanding the main topic
            * Mix of prerequisites and advanced concepts
            * Brief, clear explanation of importance
          - Topic types: prerequisite, extension, application, parallel, deeper
          - Question types: curiosity, mechanism, causality, innovation, insight`;

        const userPrompt = `Explain "${query}" in three very concise paragraphs for a ${userContext.age} year old in genz style:
          1. Basic definition (15-20 words)
          2. Key details (15-20 words)
          3. Direct applications and facts (15-20 words)

          Then provide EXACTLY:
          - 5 related topics that help understand ${query} better (age-appropriate)
          - 5 mind-blowing questions (8-12 words each) that spark curiosity
          
          Follow the format and length limits strictly.`;

        const model = this.gemini.getGenerativeModel({
          model: "gemini-1.5-flash",
        });
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.7 },
        });
        const result = await chat.sendMessageStream(userPrompt);

        let mainContent = "";
        let jsonContent = "";
        let currentTopics: any[] = [];
        let currentQuestions: any[] = [];
        let isJsonSection = false;

        for await (const chunk of result.stream) {
          const content = chunk.text() || "";
          // console.log(content);

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
                // console.log(parsed);
                // Process topics if available
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
                      !currentQuestions.some(
                        (q) => q.question === question.text
                      )
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

        return;
      } catch (error) {
        retryCount++;
        console.error(`API attempt ${retryCount} failed:`, error);

        if (retryCount === maxRetries) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(
            `Failed to stream content after ${maxRetries} attempts. ${errorMessage}`
          );
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }
  }

  streamExplorePrompts(
    query: string,
    userContext: UserContext
  ) {
    const systemPrompt = `You are a Gen-Z tutor who explains complex topics concisely for a ${userContext.age} year old.
          First provide the explanation in plain text, then provide related content in a STRICT single-line JSON format.
          
          Structure your response exactly like this:
          
          <paragraph 1>

          <paragraph 2>

          <paragraph 3>

          ---
          {"topics":[{"name":"Topic","type":"prerequisite","detail":"Why"}],"questions":[{"text":"Q?","type":"curiosity","detail":"Context"}]}

          RULES:
          - ADAPT CONTENT FOR ${userContext.age} YEAR OLD:
            
            * Match complexity of explanation to age level
            
          - STRICT LENGTH LIMITS:
            * Total explanation must be 60-80 words maximum
            * Each paragraph around 20-25 words each
            * Related questions maximum 12 words each
            * Topic details 1-2 words each
          - Keep paragraphs clear and simple
          - Third paragraph should directly state applications and facts without phrases like "In real-world applications"
          - Use "---" as separator
          - JSON must be in a single line
          - No line breaks in JSON
          - MUST provide EXACTLY 5 related topics and 5 questions
          - Related questions must be:
            * Curiosity-driven and thought-provoking
            * STRICTLY 8-12 words maximum
            * Focus on mind-blowing facts or surprising connections
            * Make users think "Wow, I never thought about that!"
          - Related topics must be:
            * Directly relevant to understanding the main topic
            * Mix of prerequisites and advanced concepts
            * Brief, clear explanation of importance
          - Topic types: prerequisite, extension, application, parallel, deeper
          - Question types: curiosity, mechanism, causality, innovation, insight`;

    const userPrompt = `Explain "${query}" in three very concise paragraphs for a ${userContext.age} year old in genz style:
          1. Basic definition (15-20 words)
          2. Key details (15-20 words)
          3. Direct applications and facts (15-20 words)

          Then provide EXACTLY:
          - 5 related topics that help understand ${query} better (age-appropriate)
          - 5 mind-blowing questions (8-12 words each) that spark curiosity
          
          Follow the format and length limits strictly.`;
    return { systemPrompt, userPrompt };
  }
}
