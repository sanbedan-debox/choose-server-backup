import { ErrorWithProps } from "mercurius";
import { MiddlewareFn } from "type-graphql";
import Context from "../types/context.type";
import { CookieKeys } from "../utils/cookie";
import { isTokenExpired } from "../utils/jwt";

export const isAuthenticated: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  // Check if context have user or not
  if (context.user === undefined || context.user === "") {
    // // If user not found check if accessToken is expired, if yes then refresh it if that is also expired just return error
    const cookie = context.req.cookies;
    const accessToken = cookie[CookieKeys.ACCESS_TOKEN];

    if (!accessToken) {
      throw new ErrorWithProps(
        "You are not authenticated to perform any action, please try again!"
      );
    }

    const accessTokenExpired = isTokenExpired(accessToken);

    if (accessTokenExpired) {
      throw new ErrorWithProps(
        "You are not authenticated to perform any action, please try again!",
        null,
        401
      );
    }

    throw new ErrorWithProps(
      "You are not authenticated to perform any action, please try again!"
    );
  }

  return await next();
};
