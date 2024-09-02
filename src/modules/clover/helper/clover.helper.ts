import axios from "axios";
import moment from "moment";
import { decryptData, encryptData } from "../../../utils/crypt";
import {
  IntegrationConnectionStatusEnum,
  IntegrationPlatformEnum,
} from "../../integration/interfaces/integration.enum";
import { IntegrationModel } from "../../integration/schema/integration.schema";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { CloverCredentialModel } from "../schema/clover.schema";

export const refreshCloverCredentials = async (
  restaurantId: string
): Promise<[string, string]> | null => {
  try {
    // Resto check
    const restaurant = await RestaurantModel.findOne({ _id: restaurantId })
      .select("integrations")
      .lean();
    if (!restaurant) {
      // TODO: Implement logger
      return null;
    }

    // Resto integrations list check
    const cloverIntegrationId = restaurant.integrations.find(
      (e) =>
        e.platform === IntegrationPlatformEnum.Clover &&
        e.connectionStatus === IntegrationConnectionStatusEnum.Connected
    ).id;
    if (!cloverIntegrationId) {
      // TODO: Implement logger
      return null;
    }

    // Integrations check
    const integation = await IntegrationModel.countDocuments({
      _id: cloverIntegrationId,
    }).lean();
    if (integation !== 1) {
      // TODO: Implement logger
      return null;
    }

    // Clover creds check
    const cloverCreds = await CloverCredentialModel.findOne({
      restaurantId: restaurantId,
      integration: cloverIntegrationId,
    }).select(
      "accessToken accessTokenExpiration refreshToken refreshTokenExpiration"
    );
    if (!cloverCreds) {
      // TODO: Implement logger
      return null;
    }

    // Get tokens expiration
    const accessTokenExpiration = moment.utc(
      cloverCreds.accessTokenExpiration * 1000
    );
    const refreshTokenExpiration = moment.utc(
      cloverCreds.refreshTokenExpiration * 1000
    );

    // Check if accessToken is expired
    if (!moment.utc().isAfter(accessTokenExpiration)) {
      return [cloverCreds.accessToken, cloverCreds.refreshToken];
    }

    // Check if refresh token is not expired
    if (!moment.utc().isBefore(refreshTokenExpiration)) {
      // TODO: Implement logger
      return null;
    }

    // Configs
    const cloverApiBaseEndpoint = process.env.CLOVER_API_ENDPOINT ?? "";
    const cloverAppId = process.env.CLOVER_APP_ID ?? "";

    const cloverReq = await axios.post(
      `${cloverApiBaseEndpoint}/oauth/v2/refresh`,
      {
        client_id: cloverAppId,
        refresh_token: decryptData(cloverCreds.refreshToken),
      },
      {}
    );

    if (!cloverReq.data) {
      // TODO: Implement logger
      return null;
    }

    // Add the details in clover credentials model
    const data = cloverReq.data;
    if (!data.access_token || !data.refresh_token) {
      // TODO: Implement logger
      return null;
    }

    const encryptedAccessToken = encryptData(data.access_token);
    const encryptedRefreshToken = encryptData(data.refresh_token);

    await CloverCredentialModel.updateOne(
      {
        restaurantId: restaurantId,
        integration: cloverIntegrationId,
      },
      {
        $set: {
          accessToken: encryptedAccessToken,
          accessTokenExpiration: cloverReq.data?.access_token_expiration ?? 0,
          refreshToken: encryptedRefreshToken,
          refreshTokenExpiration: cloverReq.data?.refresh_token_expiration ?? 0,
        },
      }
    );

    console.log("CLOVER TOKEN REFRESHED");
    return [encryptedAccessToken, encryptedRefreshToken];
  } catch (error) {
    console.log(error);
  }
};
