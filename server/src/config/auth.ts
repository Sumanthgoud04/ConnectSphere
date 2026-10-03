import { env } from "./env.js";

export const authConfig = {
  accessToken: {
    secret: env.JWT_ACCESS_SECRET,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  },

  refreshToken: {
    secret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  cookie: {
    accessToken: {
      name: "accessToken",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 15 * 60 * 1000,
    },

    refreshToken: {
      name: "refreshToken",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  },
};