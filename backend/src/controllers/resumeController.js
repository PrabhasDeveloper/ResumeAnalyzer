const pdfParse = require("pdf-parse");
const { storeResume } = require("../utils/dataStore");
const { parseResumeText } = require("../services/resumeParsingService");

async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF file is required" });
    }

    const parsed = await pdfParse(req.file.buffer);
    const extractedText = (parsed.text || "").trim();

    const { text, metadata: parseMetadata } = await parseResumeText(extractedText);

    if (!text) {
      return res.status(400).json({ message: "Unable to extract text from the PDF" });
    }

    const resume = await storeResume({
      userId: req.user.id,
      filename: req.file.originalname,
      text,
      parseMetadata,
    });

    return res.status(201).json({
      resumeId: resume.id,
      filename: resume.filename,
      textLength: resume.text.length,
      parseMetadata: resume.parseMetadata || parseMetadata,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadResume,
};