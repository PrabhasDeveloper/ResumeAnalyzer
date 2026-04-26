const express = require("express");
const multer = require("multer");
const { uploadResume } = require("../controllers/resumeController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/upload-resume", authMiddleware, upload.single("resume"), uploadResume);

module.exports = router;