const jwt = require("jsonwebtoken");

function parseBearerToken(authorizationHeader = "") {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) {
    return null;
  }
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  const payload = verifyToken(token);

  if (!payload?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = { id: String(payload.userId) };
  return next();
}

function optionalAuth(req, _res, next) {
  const token = parseBearerToken(req.headers.authorization);
  const payload = verifyToken(token);

  if (payload?.userId) {
    req.user = { id: String(payload.userId) };
  } else {
    req.user = null;
  }

  return next();
}

module.exports = {
  parseBearerToken,
  verifyToken,
  requireAuth,
  optionalAuth,
};
