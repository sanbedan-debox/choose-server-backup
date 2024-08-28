import { mongoose } from "@typegoose/typegoose";
import axios, { AxiosError } from "axios";
import { ErrorWithProps } from "mercurius";
import Context from "../../../types/context.type";
import { encryptData } from "../../../utils/crypt";
import { userHasPermission } from "../../../utils/helper";
import { isAlphanumeric } from "../../../utils/validations";
import {
  IntegrationConnectionStatusEnum,
  IntegrationPlatformEnum,
} from "../../integration/interfaces/integration.enum";
import { IntegrationModel } from "../../integration/schema/integration.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { UserModel } from "../../user/schema/user.schema";
import { CloverConnectionInput } from "../interface/clover.input";
import { CloverCredentialModel } from "../schema/clover.schema";

class CloverService {
  async validateCloverConnection(
    input: CloverConnectionInput,
    ctx: Context
  ): Promise<boolean> {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Integrations,
        PermissionTypeEnum.Menu,
      ]);
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Dummy link
      // http://localhost:3000/clover-connection?merchant_id=J0G3AWZNADB91&employee_id=DKAVJMBMYGJ4A&client_id=9GMSY6NKECECR&code=214fc4cfa48d424eb67c14e330f51940

      const { authCode, merchantId } = input;

      // Check input values
      if (!isAlphanumeric(authCode) || !isAlphanumeric(merchantId)) {
        throw new ErrorWithProps("Please provide valid details and try again!");
      }

      // Check if user exist
      const user = await UserModel.findOne({
        _id: ctx.user,
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if restaurant exist
      const restaurant = await RestaurantModel.findOne({
        _id: ctx.restaurantId,
      })
        .select("integrations")
        .lean();

      if (!restaurant) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if integration is not already added and active
      const checkAlreadyAdded = restaurant.integrations.find(
        (e) =>
          e.platform === IntegrationPlatformEnum.Clover &&
          e.connectionStatus === IntegrationConnectionStatusEnum.Connected
      );

      if (checkAlreadyAdded) {
        throw new ErrorWithProps(
          "Your Clover connection is already active, please disconnect it before trying again!"
        );
      }

      // Fetch access and refresh tokens from clover using authCode
      const cloverApiBaseEndpoint = process.env.CLOVER_API_ENDPOINT ?? "";
      const cloverAppId = process.env.CLOVER_APP_ID ?? "";
      const cloverAppSecret = process.env.CLOVER_APP_SECRET ?? "";

      const cloverReq = await axios.post(
        `${cloverApiBaseEndpoint}/oauth/v2/token`,
        {
          client_id: cloverAppId,
          client_secret: cloverAppSecret,
          code: authCode,
        },
        {}
      );

      if (!cloverReq.data) {
        throw new ErrorWithProps(
          "Clover could not verify your details, please try again or contact Clover!"
        );
      }

      // Finally save the details in integration model
      const integration = await IntegrationModel.findOneAndUpdate(
        {
          platform: IntegrationPlatformEnum.Clover,
          restaurantId: ctx.restaurantId,
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", ctx.user] },
                  then: "$user",
                  else: ctx.user,
                },
              },
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
              platform: IntegrationPlatformEnum.Clover,
              connectionStatus: IntegrationConnectionStatusEnum.Connected,
              updatedBy: ctx.user,
            },
          },
        ],
        {
          upsert: true,
          setDefaultsOnInsert: true,
          new: true,
          session: dbSession,
        }
      )
        .select("_id")
        .lean();

      // Also save / update the details in restaurant model
      if (
        restaurant.integrations
          .map((e) => e.platform)
          .includes(IntegrationPlatformEnum.Clover)
      ) {
        await RestaurantModel.updateOne(
          {
            _id: ctx.restaurantId,
            integrations: {
              $elemMatch: { platform: IntegrationPlatformEnum.Clover },
            },
          },
          {
            $set: {
              "integrations.$.connectionStatus":
                IntegrationConnectionStatusEnum.Connected,
            },
          },
          { session: dbSession }
        );
      } else {
        await RestaurantModel.updateOne(
          {
            _id: ctx.restaurantId,
          },
          {
            $addToSet: {
              integrations: {
                _id: integration._id,
                id: integration._id.toString(),
                platform: IntegrationPlatformEnum.Clover,
                connectionStatus: IntegrationConnectionStatusEnum.Connected,
              },
            },
          },
          { session: dbSession }
        );
      }

      // Add the details in clover credentials model
      const data = cloverReq.data;
      if (!data.access_token || !data.refresh_token) {
        throw new ErrorWithProps("Please provide valid details and try again!");
      }

      const encryptedAccessToken = encryptData(data.access_token);
      const encryptedRefreshToken = encryptData(data.refresh_token);

      await CloverCredentialModel.findOneAndUpdate(
        { integration: integration._id, restaurantId: ctx.restaurantId },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", ctx.user] },
                  then: "$user",
                  else: ctx.user,
                },
              },
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
              integration: integration._id,
              merchantId: merchantId,
              accessToken: encryptedAccessToken,
              accessTokenExpiration:
                cloverReq.data?.access_token_expiration ?? 0,
              refreshToken: encryptedRefreshToken,
              refreshTokenExpiration:
                cloverReq.data?.refresh_token_expiration ?? 0,
            },
          },
        ],
        {
          upsert: true,
          setDefaultsOnInsert: true,
          new: true,
          session: dbSession,
        }
      )
        .select("_id")
        .lean();

      await dbSession.commitTransaction();

      return true;
    } catch (error) {
      await dbSession.abortTransaction();
      if (error instanceof AxiosError) {
        throw new ErrorWithProps(
          error.response?.data?.message ?? error.message
        );
      }
      throw error;
    } finally {
      await dbSession.endSession();
    }
  }

  async disconnectCloverConnection(ctx: Context): Promise<boolean> {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Integrations,
        PermissionTypeEnum.Menu,
      ]);
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if user exist
      const user = await UserModel.findOne({
        _id: ctx.user,
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if restaurant exist
      const restaurant = await RestaurantModel.findOne({
        _id: ctx.restaurantId,
      })
        .select("integrations")
        .lean();

      if (!restaurant) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if integration is present and active in resto
      const checkPresentOrNotInResto = restaurant.integrations.find(
        (e) =>
          e.platform === IntegrationPlatformEnum.Clover &&
          e.connectionStatus === IntegrationConnectionStatusEnum.Connected
      );

      if (!checkPresentOrNotInResto) {
        throw new ErrorWithProps(
          "You don't have any active Clover connection, please try again!"
        );
      }

      // Check if integration is present and active
      const checkPresentOrNot = await IntegrationModel.findOne({
        restaurantId: ctx.restaurantId,
        platform: IntegrationPlatformEnum.Clover,
        connectionStatus: IntegrationConnectionStatusEnum.Connected,
      })
        .select("_id")
        .lean();
      if (!checkPresentOrNot) {
        throw new ErrorWithProps(
          "You don't have any active Clover connection, please try again!"
        );
      }

      // Finally remove from resto and delete from integrations also remove credentials
      await RestaurantModel.updateMany(
        {
          _id: ctx.restaurantId,
        },
        {
          $pull: {
            integrations: {
              _id: checkPresentOrNot._id,
              platform: IntegrationPlatformEnum.Clover,
              connectionStatus: IntegrationConnectionStatusEnum.Connected,
            },
          },
        },
        { session: dbSession }
      );

      await IntegrationModel.deleteOne(
        {
          _id: checkPresentOrNot._id,
          restaurantId: ctx.restaurantId,
          platform: IntegrationPlatformEnum.Clover,
          connectionStatus: IntegrationConnectionStatusEnum.Connected,
        },
        { session: dbSession }
      );

      await CloverCredentialModel.deleteOne(
        {
          integration: checkPresentOrNot._id,
          restaurantId: ctx.restaurantId,
        },
        { session: dbSession }
      );

      await dbSession.commitTransaction();

      return true;
    } catch (error) {
      await dbSession.abortTransaction();
      if (error instanceof AxiosError) {
        throw new ErrorWithProps(
          error.response?.data?.message ?? error.message
        );
      }
      throw error;
    } finally {
      await dbSession.endSession();
    }
  }
}

export default CloverService;
