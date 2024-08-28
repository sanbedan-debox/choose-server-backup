import Context from "../types/context.type";
import { isProduction } from "./helper";

export class CookieKeys {
  // Master Keys
  static readonly ACCESS_TOKEN = "accessToken";
  static readonly REFRESH_TOKEN = "refreshToken";
  static readonly UNIQUE_ID = "uniqueId";
  static readonly RESTAURANT_ID = "restaurantId";
  static readonly RESTAURANT_ID_ONBOARDING = "restaurantOnboarding";
}

export const getServerCookie = (cookieKey: string, ctx: Context): string => {
  const cookie = ctx.req.cookies;
  return cookie[cookieKey];
};

export const setServerCookie = (
  cookieKey: string,
  cookieValue: string,
  ctx: Context
) => {
  if (isProduction) {
    ctx.rep.setCookie(cookieKey, cookieValue, {
      maxAge: 3.154e10,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      domain: `.choosepos.com`,
      path: "/",
    });
  } else {
    ctx.rep.setCookie(cookieKey, cookieValue, {
      maxAge: 3.154e10,
      httpOnly: true,
    });
  }
};

export const clearServerCookie = (cookieKey: string, ctx: Context) => {
  ctx.rep.clearCookie(cookieKey);
};
