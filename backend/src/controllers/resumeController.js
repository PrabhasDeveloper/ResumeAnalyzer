const pdfParse = require("pdf-parse");
const { storeResume } = require("../utils/dataStore");

async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF file is required" });
    }

    const parsed = await pdfParse(req.file.buffer);
    const text = (parsed.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Unable to extract text from the PDF" });
    }

    const resume = await storeResume({
      userId: req.user.id,
      filename: req.file.originalname,
      text,
    });

    return res.status(201).json({
      resumeId: resume.id,
      filename: resume.filename,
      textLength: resume.text.length,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadResume,
};