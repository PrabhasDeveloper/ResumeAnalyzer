const { getAnalysisHistoryByUser } = require("../utils/dataStore");

async function getHistory(req, res, next) {
  try {
    const historyItems = await getAnalysisHistoryByUser(req.user.id);

    const history = historyItems.map((item) => ({
      id: item.id,
      resumeId: item.resumeId,
      role: item.role,
      score: item.analysis.score,
      matchExplanation: item.analysis.matchExplanation,
      confidenceScore: item.analysis.confidenceScore,
      createdAt: item.createdAt,
      extractedSkills: item.analysis.extractedSkills,
      missingSkills: item.analysis.missingSkills,
      suggestions: item.analysis.suggestions,
      improvedContent: item.analysis.improvedContent,
    }));

    res.json(history);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHistory,
};