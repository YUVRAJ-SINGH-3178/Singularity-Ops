const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev_only_change_me";

function getTokenFromHeader(req) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

function signAuthToken(walletAddress) {
  return jwt.sign({ walletAddress }, JWT_SECRET, {
    expiresIn: process.env.AUTH_JWT_EXPIRES_IN || "12h",
    issuer: "ddat-backend",
    audience: "ddat-frontend",
  });
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "ddat-backend",
      audience: "ddat-frontend",
    });

    req.auth = {
      walletAddress: String(payload.walletAddress || "")
        .toLowerCase()
        .trim(),
    };

    if (!req.auth.walletAddress) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid auth token" });
    }

    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired auth token" });
  }
}

module.exports = {
  requireAuth,
  signAuthToken,
};
