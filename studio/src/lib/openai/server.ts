import OpenAI from "openai";

import { getOpenAIEnv } from "@/lib/env";

let openAIClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openAIClient) {
    const env = getOpenAIEnv();

    openAIClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openAIClient;
}

export function getOpenAIModel() {
  return getOpenAIEnv().OPENAI_MODEL;
}
