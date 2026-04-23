const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

function issueToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return jwt.sign({ userId }, secret, { expiresIn: "1d" });
}

function userPayload(doc) {
  return {
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
  };
}

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server misconfiguration: JWT_SECRET is not set",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: emailNorm,
      password: hashedPassword,
    });

    const token = issueToken(user._id);
    const payload = userPayload(user);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: payload,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server misconfiguration: JWT_SECRET is not set",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = issueToken(user._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};