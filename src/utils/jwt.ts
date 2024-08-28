import jwt from "jsonwebtoken";
import { isAdminRole, isUserRole } from "../middlewares/loader";
import { AdminRole } from "../modules/admin/interface/admin.interface";
import { Admin, AdminModel } from "../modules/admin/schema/admin.schema";
import { UserRole } from "../modules/user/interfaces/user.enum";
import { User, UserModel } from "../modules/user/schema/user.schema";
import { redisClient } from "./redis";
import { isAlphanumeric } from "./validations";

export interface JwtAuthPayload {
  user: string;
  role: AdminRole | UserRole;
  version: number;
  uniqueId: string;
}

export interface JwtTeamVerificationPayload {
  email: string;
  user: string;
}

const PUBLIC_KEY = Buffer.from(process.env.PUBLIC_KEY || "", "base64").toString(
  "ascii"
);
const PRIVATE_KEY = Buffer.from(
  process.env.PRIVATE_KEY || "",
  "base64"
).toString("ascii");

const ACCESS_TOKEN_EXPIRY = "10h";
const REFRESH_TOKEN_EXPIRY = "5d";
const TEAM_VERIFICATION_TOKEN_EXPIRY = "2h";

export const createTeamVerificationToken = (
  payload: JwtTeamVerificationPayload
): string => {
  const token = jwt.sign(payload, PRIVATE_KEY, {
    expiresIn: TEAM_VERIFICATION_TOKEN_EXPIRY,
    algorithm: "RS256",
  });

  return token;
};

export const verifyTeamVerificationToken = async (
  token: string
): Promise<JwtTeamVerificationPayload | null> => {
  try {
    const payload = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload & JwtTeamVerificationPayload;

    if (!isAlphanumeric(payload.user)) {
      return null;
    }

    const user = await UserModel.findById(payload.user).select("_id").lean();

    if (!user) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
};

export const createAuthTokens = (
  payload: JwtAuthPayload
): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(payload, PRIVATE_KEY, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: "RS256",
  });

  const refreshToken = jwt.sign(payload, PRIVATE_KEY, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: "RS256",
  });

  return { accessToken, refreshToken };
};

export const refreshAuthTokens = async (
  rToken: string
): Promise<{
  user: string;
  role: UserRole | AdminRole;
  aToken: string;
  rToken: string;
  uniqueId: string;
}> | null => {
  try {
    // If access token is expired, then verify the refresh token
    const payload = jwt.verify(rToken, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload & JwtAuthPayload;

    if (!payload) {
      return null;
    }

    if (isUserRole(payload.role)) {
      const tokenName = "refreshToken";

      if (!isAlphanumeric(payload.user)) {
        return null;
      }

      const user = await UserModel.findById(payload.user)
        .select("_id role authTokenVersion")
        .lean();

      if (!user || user.authTokenVersion !== payload.version) {
        return null;
      }

      const storedToken = await redisClient.get(
        `${tokenName}:${user._id}:${payload.uniqueId}`
      );
      if (storedToken !== rToken) {
        return null;
      }

      // If it's valid then set new tokens
      const { accessToken, refreshToken } = createAuthTokens({
        role: payload.role,
        uniqueId: payload.uniqueId,
        user: payload.user,
        version: payload.version,
      });

      return {
        user: user._id.toString(),
        role: user.role,
        aToken: accessToken,
        rToken: refreshToken,
        uniqueId: payload.uniqueId,
      };
    }

    if (isAdminRole(payload.role)) {
      const tokenName = "adminRefreshToken";

      if (!isAlphanumeric(payload.user)) {
        return null;
      }

      const admin = await AdminModel.findById(payload.user)
        .select("_id role authTokenVersion")
        .lean();

      if (!admin || admin.authTokenVersion !== payload.version) {
        return null;
      }

      const storedToken = await redisClient.get(
        `${tokenName}:${admin._id}:${payload.uniqueId}`
      );
      if (storedToken !== rToken) {
        return null;
      }

      // If it's valid then set new tokens
      const { accessToken, refreshToken } = createAuthTokens({
        role: payload.role,
        uniqueId: payload.uniqueId,
        user: payload.user,
        version: payload.version,
      });

      return {
        user: admin._id.toString(),
        role: admin.role,
        aToken: accessToken,
        rToken: refreshToken,
        uniqueId: payload.uniqueId,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token: string) => {
  try {
    const payload = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload & JwtAuthPayload;

    return false;
  } catch (error) {
    if (error as jwt.TokenExpiredError) {
      return true;
    }

    return false;
  }
};

export const verifyAccessToken = async (
  aToken: string
): Promise<User | Admin> | null => {
  // Verify the acces token
  try {
    const payload = jwt.verify(aToken, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload & JwtAuthPayload;

    if (isUserRole(payload.role)) {
      if (!isAlphanumeric(payload.user)) {
        return null;
      }

      const user = await UserModel.findById(payload.user)
        .select("_id role authTokenVersion")
        .lean();

      if (!user || user.authTokenVersion !== payload.version) {
        return null;
      }

      return user;
    }

    if (isAdminRole(payload.role)) {
      if (!isAlphanumeric(payload.user)) {
        return null;
      }

      const admin = await AdminModel.findById(payload.user)
        .select("_id role authTokenVersion")
        .lean();

      if (!admin || admin.authTokenVersion !== payload.version) {
        return null;
      }

      return admin;
    }

    return null;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const storeRefreshToken = async (
  userId: string,
  uniqueId: string,
  refreshToken: string,
  type: "admin" | "user"
) => {
  try {
    const tokenName = type === "user" ? "refreshToken" : "adminRefreshToken";
    const key = `${tokenName}:${userId}:${uniqueId}`;
    await redisClient.setex(key, 5 * 24 * 60 * 60, refreshToken);
  } catch (error) {
    console.log(error.toString());
  }
};

export const revokeRefreshToken = async (
  userId: string,
  uniqueId: string,
  type: "admin" | "user"
) => {
  try {
    const tokenName = type === "user" ? "refreshToken" : "adminRefreshToken";
    await redisClient.del(`${tokenName}:${userId}:${uniqueId}`);
  } catch (error) {
    console.log(error.toString());
  }
};

export const revokeAllRefreshTokens = async (
  userId: string,
  type: "admin" | "user",
  uniqueId?: string
) => {
  try {
    const tokenName = type === "user" ? "refreshToken" : "adminRefreshToken";

    const keys = await redisClient.keys(`${tokenName}:${userId}:*`);
    for (const key of keys) {
      if (!uniqueId || key !== `${tokenName}:${userId}:${uniqueId}`) {
        await redisClient.del(key);
      }
    }
  } catch (error) {
    console.log(error.toString());
  }
};
