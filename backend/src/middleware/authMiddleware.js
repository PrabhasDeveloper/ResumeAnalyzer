const jwt = require("jsonwebtoken");
const { findUserById } = require("../utils/dataStore");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authorization token is missing" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = {
  authMiddleware,
};