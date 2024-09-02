import { mongoose } from "@typegoose/typegoose";
import axios, { AxiosError } from "axios";
import { ErrorWithProps } from "mercurius";
import { StatusEnum } from "../../../types/common.enum";
import Context from "../../../types/context.type";
import { decryptData, encryptData } from "../../../utils/crypt";
import { userHasPermission } from "../../../utils/helper";
import { isAlphanumeric } from "../../../utils/validations";
import { CsvHelpers } from "../../csv/helper/csv.helper";
import {
  IntegrationConnectionStatusEnum,
  IntegrationPlatformEnum,
} from "../../integration/interfaces/integration.enum";
import { IntegrationModel } from "../../integration/schema/integration.schema";
import {
  ItemOptionsEnum,
  PermissionTypeEnum,
} from "../../masters/interface/masters.enum";
import { MastersService } from "../../masters/services/masters.service";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { MenuModel } from "../../menu/schema/menu.schema";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { UserModel } from "../../user/schema/user.schema";
import { refreshCloverCredentials } from "../helper/clover.helper";
import { CloverConnectionInput } from "../interface/clover.input";
import {
  CloverCategories,
  CloverInventory,
  CloverItems,
  CloverModifierGroups,
  CloverModifiers,
  CloverQueueType,
  CloverRowFinalItemOptions,
  CloverRowItem,
  CloverRowItemPriceOptions,
  CloverRowItemVisibility,
} from "../interface/clover.type";
import { CloverQueue } from "../queue/clover.queue";
import { CloverCredentialModel } from "../schema/clover.schema";

interface ClientItem {
  name: string;
  price: number;
  status: boolean;
  categories: {
    name: string;
    status: boolean;
  }[];
  modifierGroups: {
    name: string;
    minRequired: number;
    maxRequired: number;
    modifiers: {
      name: string;
      price: number;
    }[];
  }[];
}

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

      // Check if integration is present and active in resto
      const checkPresentOrNotInResto = restaurant.integrations.find(
        (e) =>
          e.platform === IntegrationPlatformEnum.Clover &&
          e.connectionStatus === IntegrationConnectionStatusEnum.Connected
      );

      if (checkPresentOrNotInResto) {
        throw new ErrorWithProps(
          "Your Clover connection is already active, please disconnect it before trying again!"
        );
      }

      // Check if integration is present
      const integrationCheck = await IntegrationModel.findOne({
        restaurantId: ctx.restaurantId,
        platform: IntegrationPlatformEnum.Clover,
      })
        .select("_id connectionStatus")
        .lean();

      if (
        integrationCheck?.connectionStatus ===
        IntegrationConnectionStatusEnum.Connected
      ) {
        throw new ErrorWithProps(
          "Your Clover connection is already active, please disconnect it before trying again!"
        );
      }

      // Check if creds is present
      const credsCheck = await CloverCredentialModel.findOne({
        restaurantId: ctx.restaurantId,
      })
        .select("_id repeatJobKey")
        .lean();

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
      let integrationId = "";
      if (integrationCheck) {
        await IntegrationModel.updateOne(
          {
            _id: integrationCheck._id,
            platform: IntegrationPlatformEnum.Clover,
            restaurantId: ctx.restaurantId,
          },
          [
            {
              $set: {
                user: ctx.user,
                connectionStatus: IntegrationConnectionStatusEnum.Connected,
                updatedBy: ctx.user,
              },
            },
          ],
          {
            session: dbSession,
          }
        );

        integrationId = integrationCheck._id.toString();
      } else {
        integrationId = new mongoose.Types.ObjectId().toString();

        await IntegrationModel.create(
          [
            {
              _id: integrationId,
              user: ctx.user,
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
              platform: IntegrationPlatformEnum.Clover,
              connectionStatus: IntegrationConnectionStatusEnum.Connected,
              updatedBy: ctx.user,
            },
          ],
          { session: dbSession }
        );
      }

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
                _id: integrationId,
                id: integrationId,
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

      let cloverId = "";
      if (credsCheck) {
        await CloverCredentialModel.updateOne(
          {
            integration: integrationId,
            restaurantId: ctx.restaurantId,
            _id: credsCheck._id,
          },
          [
            {
              $set: {
                user: ctx.user,
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
            session: dbSession,
          }
        );

        cloverId = credsCheck._id.toString();
      } else {
        cloverId = new mongoose.Types.ObjectId().toString();
        await CloverCredentialModel.create(
          [
            {
              _id: cloverId,
              user: ctx.user,
              restaurantId: ctx.restaurantId,
              integration: new mongoose.Types.ObjectId(integrationId),
              merchantId: merchantId,
              accessToken: encryptedAccessToken,
              accessTokenExpiration:
                cloverReq.data?.access_token_expiration ?? 0,
              refreshToken: encryptedRefreshToken,
              refreshTokenExpiration:
                cloverReq.data?.refresh_token_expiration ?? 0,
            },
          ],
          { session: dbSession }
        );
      }

      await dbSession.commitTransaction();

      // Add to clover queue for auto token refresh
      await CloverQueue.add({
        type: CloverQueueType.TokenRefresh,
        restaurantId: ctx.restaurantId,
        user: ctx.user,
        credsId: cloverId,
      });

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

      // Check if creds is present
      const checkCreds = await CloverCredentialModel.findOne({
        restaurantId: ctx.restaurantId,
      })
        .select("repeatJobKey")
        .lean();
      if (!checkCreds?.repeatJobKey) {
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

      await CloverQueue.removeRepeatable(checkCreds.repeatJobKey);

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

  async fetchCloverInventory(ctx: Context): Promise<CloverInventory> {
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Menu,
      ]);
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if clover is connected or not for selected restuarant
      const clover = await CloverCredentialModel.findOne({
        restaurantId: ctx.restaurantId,
      }).select("-user -integration -createdAt -updatedAt");

      if (!clover) {
        throw new ErrorWithProps(
          "You are not connected with an active clover account, please try again!"
        );
      }

      const cloverCreds = await refreshCloverCredentials(ctx.restaurantId);
      if (!cloverCreds || (cloverCreds?.length ?? 0) !== 2) {
        throw new ErrorWithProps(
          "You are not connected with an active clover account, please try again!"
        );
      }

      const accessToken = decryptData(cloverCreds[0]);

      // Configs
      const cloverApiBaseEndpoint = process.env.CLOVER_API_ENDPOINT ?? "";

      const cloverItemsReq = await axios.get(
        `${cloverApiBaseEndpoint}/v3/merchants/${
          clover.merchantId
        }/items?expand=${encodeURIComponent("categories,modifierGroups")}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!cloverItemsReq.data) {
        throw new ErrorWithProps(
          "Something went wrong while fetching data from clover, please try again!"
        );
      }

      // Data construction
      let cloverItemsList = cloverItemsReq.data?.elements ?? [];

      const modifierGroupIdsSet = new Set<string>();
      cloverItemsList.forEach((item: any) => {
        item.modifierGroups.elements.forEach((mg: any) =>
          modifierGroupIdsSet.add(mg.id)
        );
      });
      const modifierGroupIds = Array.from(modifierGroupIdsSet);

      const modifierPromises = Array.from(modifierGroupIds).map((e) =>
        axios.get(
          `${cloverApiBaseEndpoint}/v3/merchants/${clover.merchantId}/modifier_groups/${e}/modifiers`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
      );
      const modifierResponses = await Promise.all(modifierPromises);
      const modifierDataArray = modifierResponses.map((res) => res.data);

      const modifiersByGroupId = new Map<string, CloverModifiers[]>();
      modifierDataArray.forEach((modifierData, index) => {
        const groupId = modifierGroupIds[index];
        modifiersByGroupId.set(
          groupId,
          modifierData.elements.map((e: any) => ({
            id: e.id,
            name: e.name,
            price: e.price,
          }))
        );
      });

      const categoriesMap = new Map<string, CloverCategories>();
      const itemsArray: CloverItems[] = [];
      const modifierGroupsArray: CloverModifierGroups[] = [];
      const modifiersArray: CloverModifiers[] = [];

      cloverItemsList.forEach((item: any) => {
        // Handling items array
        const itemObject: CloverItems = {
          id: item.id,
          name: item.name,
          price: item.price,
          status: item.available,
          modifierGroups: item.modifierGroups.elements.map((e: any) => e.id),
        };

        itemsArray.push(itemObject);

        // Handling categories array
        item.categories.elements.forEach((category: any) => {
          if (!categoriesMap.has(category.id)) {
            categoriesMap.set(category.id, {
              id: category.id,
              name: category.name,
              status: false,
              items: [],
            });
          }
          const categoryObject = categoriesMap.get(category.id);
          categoryObject.items.push(item.id);
          if (item.available) {
            categoryObject.status = true;
          }
        });

        // Handle modifier groups and modifiers
        item.modifierGroups.elements.forEach((mg: any) => {
          if (!modifierGroupsArray.some((group) => group.id === mg.id)) {
            const groupModifiers = modifiersByGroupId.get(mg.id) || [];
            const modifierIds = groupModifiers.map((mod) => mod.id);
            const modifierGroup: CloverModifierGroups = {
              id: mg.id,
              name: mg.name,
              minRequired: mg.minRequired ?? 0,
              maxRequired: mg.maxRequired ?? 1,
              modifiers: modifierIds,
            };
            modifierGroupsArray.push(modifierGroup);

            // Add modifiers to the modifiers array
            groupModifiers.forEach((modifier) => {
              modifiersArray.push({
                id: modifier.id,
                name: modifier.name,
                price: modifier.price,
              });
            });
          }
        });
      });

      const categoriesArray = Array.from(categoriesMap.values());

      const respData: CloverInventory = {
        categories: categoriesArray,
        items: itemsArray,
        modifierGroups: modifierGroupsArray,
        modifiers: modifiersArray,
      };

      return respData;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new ErrorWithProps(
          error.response?.data?.message ?? error.message
        );
      }
      throw error;
    }
  }

  async isCloverConnected(ctx: Context): Promise<boolean> {
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Menu,
      ]);
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
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
        return false;
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
        return false;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async saveCloverData(
    rowItems: CloverRowItem[],
    ctx: Context
  ): Promise<boolean> {
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Menu,
      ]);
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
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

      if (rowItems.length <= 0) {
        throw new ErrorWithProps("No data found to save, please try again!");
      }

      // Loop through and validate the data
      for (let i = 0; i < rowItems.length; i++) {
        const item = rowItems[i];

        // Check for basic validations
        if (CsvHelpers.invalidStringCellValue(item.name)) {
          throw new ErrorWithProps(
            `${item.name} item name is invalid, please try again!`
          );
        }

        if (item.price <= 0) {
          throw new ErrorWithProps(
            `Price cannot be less then or equal to zero for ${item.name}, please try again!`
          );
        }

        // Create visibility and priceOptions
        const menus = await MenuModel.find({ type: { $ne: null } })
          .select("type")
          .lean();
        const uniqueMenuTypes = new Set<MenuTypeEnum>();
        menus.forEach((menu) => uniqueMenuTypes.add(menu.type));

        let visibilityArr: CloverRowItemVisibility[] = [];
        let priceOptionsArr: CloverRowItemPriceOptions[] = [];

        uniqueMenuTypes.forEach((menuType) => {
          visibilityArr.push({
            menuType: menuType,
            status: item.status ? StatusEnum.active : StatusEnum.inactive,
          });

          priceOptionsArr.push({ menuType: menuType, price: item.price });
        });

        rowItems[i].visibility = visibilityArr;
        rowItems[i].priceOptions = priceOptionsArr;

        // Check item options
        let isHalalPresent = false;
        let isVeganPresent = false;

        const masterServices = new MastersService();
        const allItemOptions = await masterServices.getAllItemOptions();
        let finalItemOptions: CloverRowFinalItemOptions[] = [];

        // if (allItemOptions.length !== item.options.length) {
        //   throw new ErrorWithProps(
        //     `All item options must be added for ${item.name} item, please try again!`
        //   );
        // }

        for (let i = 0; i < item.options.length; i++) {
          const option = item.options[i];
          const check = allItemOptions.findIndex((e) => e.type === option.type);
          if (check < 0) {
            throw new ErrorWithProps(
              `${item.name} item cannot have any invalid options, please try again!`
            );
          }
          const opt = allItemOptions[check];

          if (option.type === ItemOptionsEnum.IsHalal && option.status) {
            isHalalPresent = true;
          }
          if (option.type === ItemOptionsEnum.IsVegan && option.status) {
            isVeganPresent = true;
          }

          finalItemOptions.push({
            _id: opt._id,
            desc: opt.desc,
            displayName: opt.displayName,
            status: option.status,
            type: opt.type,
          });
        }

        if (isHalalPresent && isVeganPresent) {
          throw new ErrorWithProps(
            `${item.name} item cannot be halal and vegan at the same time, please try again!`
          );
        }
        rowItems[i].itemOptions = finalItemOptions;

        // Categories Check
        for (let j = 0; j < item.categories.length; j++) {
          const cate = item.categories[j];

          // Check for basic validations
          if (CsvHelpers.invalidStringCellValue(cate.name)) {
            throw new ErrorWithProps(
              `${cate.name} category name is invalid, please try again!`
            );
          }
        }

        // Modifier Groups Check
        for (let k = 0; k < item.modifierGroups.length; k++) {
          const mg = item.modifierGroups[k];

          // Check for basic validations
          if (CsvHelpers.invalidStringCellValue(mg.name)) {
            throw new ErrorWithProps(
              `${mg.name} modifier group name is invalid, please try again!`
            );
          }

          if (mg.minRequired > mg.maxRequired) {
            throw new ErrorWithProps(
              `Min Required cannot be greater than Max Required for ${mg.name} modifier group!`
            );
          }

          // Modifier Checks
          for (let l = 0; l < mg.modifiers.length; l++) {
            const modi = mg.modifiers[l];

            // Check for basic validations
            if (CsvHelpers.invalidStringCellValue(modi.name)) {
              throw new ErrorWithProps(
                `${modi.name} modifier name is invalid, please try again!`
              );
            }

            if (modi.price < 0) {
              throw new ErrorWithProps(
                `Price cannot be less then zero for ${modi.name} modifier, please try again!`
              );
            }
          }
        }
      }

      // Once validated move it to queue for processing
      await CloverQueue.add({
        type: CloverQueueType.SaveCloverData,
        restaurantId: ctx.restaurantId,
        user: ctx.user,
        rowItems: rowItems,
      });

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default CloverService;
