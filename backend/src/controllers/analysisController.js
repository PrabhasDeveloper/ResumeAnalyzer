const { getResumeById, storeAnalysisHistory } = require("../utils/dataStore");
const { runResumeAnalysis } = require("../services/analysisService");

async function analyze(req, res, next) {
  try {
    const { resumeId, role, jobDescription } = req.body;

    if (!resumeId || !role || !jobDescription) {
      return res.status(400).json({
        message: "resumeId, role, and jobDescription are required",
      });
    }

    const resume = await getResumeById(String(resumeId));

    if (!resume || resume.userId !== req.user.id) {
      return res.status(404).json({ message: "Resume not found for this user" });
    }

    const analysis = await runResumeAnalysis({
      resumeText: resume.text,
      role,
      jobDescription,
    });

    const historyRecord = await storeAnalysisHistory({
      userId: req.user.id,
      resumeId: resume.id,
      role,
      jobDescription,
      analysis,
    });

    return res.json({
      resumeId: resume.id,
      ...analysis,
      historyId: historyRecord.id,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  analyze,
};