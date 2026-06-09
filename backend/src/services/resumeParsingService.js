const { generateStructuredJson } = require("../utils/aiClient");

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function estimateTextQuality(text) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return {
      score: 0,
      reason: "empty_text",
      lineCount: 0,
      avgWordsPerLine: 0,
      shortLineRatio: 1,
    };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lineCount = lines.length;
  const wordsPerLine = lines.map((line) => line.split(/\s+/).filter(Boolean).length);
  const totalWords = wordsPerLine.reduce((sum, count) => sum + count, 0);
  const avgWordsPerLine = lineCount ? totalWords / lineCount : 0;
  const shortLines = wordsPerLine.filter((count) => count <= 3).length;
  const shortLineRatio = lineCount ? shortLines / lineCount : 1;

  // Two-column extraction often produces many short, fragmented lines.
  let score = 1;
  if (lineCount >= 20 && avgWordsPerLine < 4.2) {
    score -= 0.45;
  }
  if (shortLineRatio > 0.6) {
    score -= 0.35;
  }
  if (totalWords < 80) {
    score -= 0.2;
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  let reason = "high_quality";
  if (score < 0.5 && shortLineRatio > 0.6) {
    reason = "likely_multicolumn_or_fragmented";
  } else if (score < 0.5) {
    reason = "low_text_quality";
  }

  return {
    score,
    reason,
    lineCount,
    avgWordsPerLine: Number(avgWordsPerLine.toFixed(2)),
    shortLineRatio: Number(shortLineRatio.toFixed(2)),
  };
}

async function reconstructTextWithAi(rawText) {
  const prompt = `
You are reconstructing resume text extracted from PDF where line order may be broken by multi-column layout.

Task:
- Reorder and clean text into coherent reading order.
- Preserve all factual content from the source.
- Do not invent details.
- Keep plain resume text format with section headings and bullet-style lines where appropriate.

Return strict JSON with:
- reconstructedText: string
- confidence: number between 0 and 1

Source text:
${rawText}
`;

  const output = await generateStructuredJson(prompt, {
    reconstructedText: "",
    confidence: 0.5,
  });

  return {
    reconstructedText: normalizeWhitespace(output.reconstructedText || ""),
    confidence: Number(output.confidence) || 0.5,
  };
}

async function parseResumeText(rawExtractedText) {
  const cleanedRawText = normalizeWhitespace(rawExtractedText);
  const quality = estimateTextQuality(cleanedRawText);

  const metadata = {
    qualityScore: quality.score,
    qualityReason: quality.reason,
    usedAiFallback: false,
    aiFallbackConfidence: null,
  };

  const shouldTryAiFallback =
    quality.score < 0.5 &&
    process.env.ENABLE_AI_PARSE_FALLBACK !== "false" &&
    Boolean(process.env.OPENAI_API_KEY);

  if (!shouldTryAiFallback) {
    return {
      text: cleanedRawText,
      metadata,
    };
  }

  try {
    const reconstructed = await reconstructTextWithAi(cleanedRawText);
    const betterText = reconstructed.reconstructedText;

    if (betterText && betterText.length >= Math.max(120, cleanedRawText.length * 0.55)) {
      metadata.usedAiFallback = true;
      metadata.aiFallbackConfidence = Number(reconstructed.confidence.toFixed(2));

      return {
        text: betterText,
        metadata,
      };
    }
  } catch (error) {
    // Keep upload flow resilient when AI parsing is unavailable.
  }

  return {
    text: cleanedRawText,
    metadata,
  };
}

module.exports = {
  parseResumeText,
};