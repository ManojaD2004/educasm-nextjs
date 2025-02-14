// src/hooks/useApi.ts
import { useState } from "react";
import { Question, UserContext } from "../types";
import { api } from "../services/api";

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getQuestion = async (
    topic: string,
    level: number,
    userContext: UserContext
  ): Promise<Question> => {
    try {
      setIsLoading(true);
      return await api.getQuestion(topic, level, userContext);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const streamExploreContent = async (
    query: string,
    userContext: UserContext,
    onChunk: (content: {
      text?: string;
      topics?: any[];
      questions?: any[];
    }) => void
  ) => {
    try {
      setIsLoading(true);
      await api.streamExploreContent(query, userContext, onChunk);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    getQuestion,
    streamExploreContent,
  };
};
