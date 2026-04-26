const crypto = require("crypto");
const { createEmbedding } = require("../utils/aiClient");

const embeddingCache = new Map();

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(vector) {
  return Math.sqrt(dotProduct(vector, vector));
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    throw new Error("Invalid embeddings for cosine similarity");
  }

  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct(a, b) / (magA * magB);
}

async function getEmbeddingWithCache(text) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    throw new Error("Embedding text input cannot be empty");
  }

  const key = hashText(normalized);
  const cached = embeddingCache.get(key);

  if (cached) {
    return cached;
  }

  const vector = await createEmbedding(normalized);
  embeddingCache.set(key, vector);
  return vector;
}

async function similarityFromTexts(textA, textB) {
  const [embeddingA, embeddingB] = await Promise.all([
    getEmbeddingWithCache(textA),
    getEmbeddingWithCache(textB),
  ]);

  return cosineSimilarity(embeddingA, embeddingB);
}

module.exports = {
  getEmbeddingWithCache,
  similarityFromTexts,
  cosineSimilarity,
  embeddingCache,
};