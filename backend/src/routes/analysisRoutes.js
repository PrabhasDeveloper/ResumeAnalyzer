const express = require("express");
const { analyze } = require("../controllers/analysisController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/analyze", authMiddleware, analyze);

module.exports = router;