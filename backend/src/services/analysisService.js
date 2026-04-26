const { similarityFromTexts, getEmbeddingWithCache, cosineSimilarity } = require("./embeddingService");
const { generateStructuredJson, generateText } = require("../utils/aiClient");
const { generateSuggestions } = require("./suggestionService");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function extractSkillsFromResume(resumeText) {
  const prompt = `
Extract technical and domain skills from this resume.
Return strict JSON with:
- skills: string[]
- confidence: number between 0 and 1

Resume:
${resumeText}
`;

  const output = await generateStructuredJson(prompt, {
    skills: [],
    confidence: 0.7,
  });

  return {
    skills: Array.isArray(output.skills) ? output.skills.map(String) : [],
    confidence: Number(output.confidence) || 0.7,
  };
}

async function extractRequiredSkillsFromJob(role, jobDescription) {
  const prompt = `
From this target role and job description, extract required technical and domain skills.
Return strict JSON with:
- requiredSkills: string[]
- confidence: number between 0 and 1

Role: ${role}
Job Description:
${jobDescription}
`;

  const output = await generateStructuredJson(prompt, {
    requiredSkills: [],
    confidence: 0.7,
  });

  return {
    requiredSkills: Array.isArray(output.requiredSkills) ? output.requiredSkills.map(String) : [],
    confidence: Number(output.confidence) || 0.7,
  };
}

async function detectMissingSkills(requiredSkills, resumeSkills) {
  if (!requiredSkills.length) {
    return {
      missingSkills: [],
      confidence: 0.65,
    };
  }

  if (!resumeSkills.length) {
    return {
      missingSkills: requiredSkills,
      confidence: 0.75,
    };
  }

  const resumeEmbeddings = await Promise.all(
    resumeSkills.map((skill) => getEmbeddingWithCache(skill)),
  );

  const requiredEmbeddings = await Promise.all(
    requiredSkills.map((skill) => getEmbeddingWithCache(skill)),
  );

  const matches = requiredSkills.map((requiredSkill, requiredIndex) => {
    const requiredEmbedding = requiredEmbeddings[requiredIndex];
    let maxSimilarity = -1;

    for (let i = 0; i < resumeEmbeddings.length; i += 1) {
      const similarity = cosineSimilarity(requiredEmbedding, resumeEmbeddings[i]);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    return {
      skill: requiredSkill,
      similarity: maxSimilarity,
    };
  });

  const semanticThreshold = 0.82;
  const missingSkills = matches
    .filter((m) => m.similarity < semanticThreshold)
    .map((m) => m.skill);

  const avgSimilarity = matches.reduce((acc, cur) => acc + cur.similarity, 0) / matches.length;
  const confidence = clamp(0.55 + Math.abs(avgSimilarity - semanticThreshold), 0, 1);

  return {
    missingSkills,
    confidence,
  };
}

async function generateMatchExplanation({ score, role, resumeText, jobDescription, missingSkills }) {
  const prompt = `
Explain why this resume scored ${score}% for the role "${role}".

Provide a concise and specific explanation in 2-4 sentences.

Known missing skills from AI comparison:
${JSON.stringify(missingSkills)}

Job Description:
${jobDescription}

Resume Text:
${resumeText}
`;

  const explanation = await generateText(prompt);
  return explanation.trim();
}

async function runResumeAnalysis({ resumeText, role, jobDescription }) {
  const similarity = await similarityFromTexts(resumeText, jobDescription);
  const score = clamp(Number((similarity * 100).toFixed(2)), 0, 100);

  const [resumeSkillResult, requiredSkillResult] = await Promise.all([
    extractSkillsFromResume(resumeText),
    extractRequiredSkillsFromJob(role, jobDescription),
  ]);

  const { missingSkills, confidence: missingConfidence } = await detectMissingSkills(
    requiredSkillResult.requiredSkills,
    resumeSkillResult.skills,
  );

  const suggestionResult = await generateSuggestions({
    role,
    resumeText,
    jobDescription,
    missingSkills,
    extractedSkills: resumeSkillResult.skills,
  });

  const matchExplanation = await generateMatchExplanation({
    score,
    role,
    resumeText,
    jobDescription,
    missingSkills,
  });

  const confidenceScore = clamp(
    Number(
      (
        (resumeSkillResult.confidence +
          requiredSkillResult.confidence +
          missingConfidence +
          suggestionResult.confidence) /
        4
      ).toFixed(2),
    ),
    0,
    1,
  );

  return {
    score,
    matchExplanation,
    extractedSkills: resumeSkillResult.skills,
    missingSkills,
    suggestions: suggestionResult.suggestions,
    improvedContent: suggestionResult.improvedContent,
    confidenceScore,
  };
}

module.exports = {
  runResumeAnalysis,
};