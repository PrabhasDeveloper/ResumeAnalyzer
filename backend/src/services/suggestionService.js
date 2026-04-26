const { generateStructuredJson } = require("../utils/aiClient");

async function generateSuggestions({ role, resumeText, jobDescription, missingSkills, extractedSkills }) {
  const prompt = `
You are an expert resume coach and hiring analyst.

Analyze the resume and target role context and return strict JSON with:
- suggestions: array of detailed, actionable improvements
- improvedContent: array of rewritten bullet points for the resume
- confidence: number between 0 and 1 that reflects confidence in these suggestions

Role: ${role}

Extracted resume skills: ${JSON.stringify(extractedSkills)}
Missing skills: ${JSON.stringify(missingSkills)}

Job Description:
${jobDescription}

Resume Text:
${resumeText}
`;

  const output = await generateStructuredJson(prompt, {
    suggestions: [],
    improvedContent: [],
    confidence: 0.75,
  });

  return {
    suggestions: Array.isArray(output.suggestions) ? output.suggestions.map(String) : [],
    improvedContent: Array.isArray(output.improvedContent) ? output.improvedContent.map(String) : [],
    confidence: Number(output.confidence) || 0.75,
  };
}

module.exports = {
  generateSuggestions,
};