const OpenAI = require("openai");

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI endpoints will fail until configured.");
}

let openaiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

async function createEmbedding(text) {
  const response = await getOpenAIClient().embeddings.create({
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

async function generateText(prompt) {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You are a precise AI recruiting and resume analysis assistant.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

async function generateStructuredJson(prompt, fallback = {}) {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an AI resume analysis engine. Always return valid JSON only, no markdown fences.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;

  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  createEmbedding,
  generateText,
  generateStructuredJson,
};