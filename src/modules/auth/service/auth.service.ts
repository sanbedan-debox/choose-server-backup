import Context from "../../../types/context.type";
import { CookieKeys, setServerCookie } from "../../../utils/cookie";
import { isTokenExpired, refreshAuthTokens } from "../../../utils/jwt";

class AuthService {
  async handleTokensRefresh(ctx: Context): Promise<boolean> {
    try {
      // Get tokens from cookie
      const cookie = ctx.req.cookies;
      const accessToken = cookie[CookieKeys.ACCESS_TOKEN];
      const refreshToken = cookie[CookieKeys.REFRESH_TOKEN];

      if (!accessToken || !refreshToken) {
        return false;
      }

      // Check if accessToken is expired or is it invalid
      const accessTokenExpired = isTokenExpired(accessToken);

      // If it's not expired and is invalid response with 403
      if (accessTokenExpired === false) {
        return false;
      }

      // Refresh the token
      const refreshedData = await refreshAuthTokens(refreshToken);

      if (!refreshedData) {
        return false;
      }

      // Get updated data
      const { role, user, aToken, rToken, uniqueId } = refreshedData;

      // Set new tokens in cookie
      setServerCookie(CookieKeys.ACCESS_TOKEN, aToken, ctx);
      setServerCookie(CookieKeys.REFRESH_TOKEN, rToken, ctx);

      // Set new token in redis store
      //   await storeRefreshToken(
      //     user,
      //     uniqueId,
      //     rToken,
      //     isUserRole(role) ? "user" : "admin"
      //   );

      console.log("refreshed");

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default AuthService;
