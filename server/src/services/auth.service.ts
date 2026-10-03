import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import type { SignupInput } from "../utils/validators/auth.validator.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { RefreshToken } from "../models/RefreshToken.js";
import { authConfig } from "../config/auth.js";
import type { LoginInput } from "../utils/validators/auth.validator.js";

export const signup = async (input: SignupInput) => {
  const existingUser = await User.findOne({
    email: input.email,
  });

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    headline: user.headline,
    about: user.about,
    experience: user.experience,
    education: user.education,
    skills: user.skills,
  };
};

//login 

export const login = async (input: LoginInput) => {
  const user = await User.findOne({
    email: input.email,
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(
    input.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const userId = user._id.toString();

  const accessToken = jwt.sign(
    { userId, type: "access" },
    authConfig.accessToken.secret,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      userId,
      type: "refresh",
      jti: randomUUID(),
    },
    authConfig.refreshToken.secret,
    { expiresIn: "7d" },
  );

  const tokenHash = createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + authConfig.cookie.refreshToken.maxAge,
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      photo: user.photo,
      headline: user.headline,
      about: user.about ?? "",
      experience: user.experience ?? [],
      education: user.education ?? [],
      skills: user.skills ?? [],
    },
    accessToken,
    refreshToken,
  };
};

// refresh token 

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  type: "refresh";
}

export const refreshAccessToken = async (token: string) => {
  let payload: RefreshTokenPayload;

  try {
    payload = jwt.verify(
      token,
      authConfig.refreshToken.secret,
    ) as RefreshTokenPayload;
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (!payload.userId || payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const storedToken = await RefreshToken.findOne({
    tokenHash,
    userId: payload.userId,
    revokedAt: { $exists: false },
  });

  if (!storedToken) {
    throw new Error("Refresh token has been revoked or is invalid");
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new Error("Refresh token has expired");
  }

  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      type: "access",
    },
    authConfig.accessToken.secret,
    {
      expiresIn: "15m",
    },
  );

  return accessToken;
};

//logout

export const logout = async (token: string) => {
  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  await RefreshToken.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: { $exists: false },
    },
    {
      revokedAt: new Date(),
    },
  );
};

//get current user

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    photo: user.photo ?? "",
    headline: user.headline ?? "",
    about: user.about ?? "",
    experience: user.experience,
    education: user.education,
    skills: user.skills,
  };
};