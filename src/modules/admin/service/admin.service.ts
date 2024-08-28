import { FastifyRequest } from "fastify";
import { ErrorWithProps } from "mercurius";
import moment from "moment";
import { FilterQuery } from "mongoose";
import { nanoid } from "nanoid";
import { FilterOperatorsEnum, StatusEnum } from "../../../types/common.enum";
import { PaginatedFilter } from "../../../types/common.input";
import Context from "../../../types/context.type";
import {
  clearServerCookie,
  CookieKeys,
  setServerCookie,
} from "../../../utils/cookie";
import { parseUserAgent } from "../../../utils/helper";
import {
  createAuthTokens,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  storeRefreshToken,
} from "../../../utils/jwt";
import {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
} from "../../../utils/rateLimit";
import { enumValidation } from "../../../utils/validations";
import { BusinessModel } from "../../business/schema/business.schema";
import { CategoryModel } from "../../categories/schema/category.schema";
import { CloverCredentialModel } from "../../clover/schema/clover.schema";
import {
  CsvUploadErrorModel,
  CsvUploadModel,
} from "../../csv/schema/csv.schema";
import { IntegrationModel } from "../../integration/schema/integration.schema";
import { ItemModel } from "../../items/schema/item.schema";
import { MenuModel } from "../../menu/schema/menu.schema";
import {
  ModifierGroupModel,
  ModifierModel,
} from "../../modifiers/schema/modifier.schema";
import { OtpModel } from "../../otp/schema/otp.schema";
import { TwoFactorAuthModel } from "../../otp/schema/two-factor-auth.schema";
import OtpService from "../../otp/services/otp.service";
import { RestaurantStatus } from "../../restaurant/interfaces/restaurant.enums";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { SubCategoryModel } from "../../subCategories/schema/subCategories.schema";
import { TaxRateModel } from "../../taxRate/schema/taxRate.schema";
import { TeamsModel } from "../../teams/schema/teams.schema";
import { UserStatus } from "../../user/interfaces/user.enum";
import { RejectRecord } from "../../user/interfaces/user.objects";
import { User, UserModel } from "../../user/schema/user.schema";
import { WaitListUserModel } from "../../watilist-user/schema/waitlist-user.schema";
import {
  AddAdminInput,
  AdminRole,
  AdminStatus,
} from "../interface/admin.interface";
import { Admin, AdminModel } from "../schema/admin.schema";

class AdminService {
  async me(ctx: Context): Promise<Admin> {
    try {
      const admin = await AdminModel.findOne({ _id: ctx?.user }).lean();
      if (admin) {
        return admin;
      } else {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }
    } catch (error: any) {
      throw new ErrorWithProps("Something went wrong.");
    }
  }

  async addAdmin(input: AddAdminInput, ctx: Context) {
    try {
      if (ctx?.role !== AdminRole.master) {
        throw new ErrorWithProps("You are not authorized to add admin");
      }

      if (!input?.email || !input?.name || !input?.role) {
        throw new ErrorWithProps("Invalid input");
      }

      const user = await AdminModel.countDocuments({ email: input?.email });

      if (user > 0) {
        throw new ErrorWithProps("User already exists");
      }

      await AdminModel.create({
        email: input.email,
        name: input.name,
        role: input.role,
        createdBy: ctx?.user,
        createdAt: moment.utc().toDate(),
      });

      return true;

      // await
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps("Something went wrong.");
    }
  }

  async getAdmins(ctx: Context): Promise<Admin[]> {
    try {
      if (ctx?.role !== AdminRole.master) {
        throw new ErrorWithProps("You are not authorized to see admins");
      }
      const admins = await AdminModel.find({}).lean();

      return admins;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async revokeAdminAccess(id: string, ctx: Context) {
    try {
      if (!id) {
        throw new ErrorWithProps("Invalid input");
      }

      if (ctx?.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to revoke admin access."
        );
      }

      const admin = await AdminModel.findById(id)
        .select("_id accessHistory")
        .lean();

      if (!admin) {
        throw new ErrorWithProps("Admin not found.");
      }

      await revokeAllRefreshTokens(id, "admin");

      await AdminModel.findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: {
            updatedBy: ctx?.user,
            lastLoggedOut: moment.utc().toDate(),
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error as string);
    }
  }

  async changeRole(
    ctx: Context,
    id: string,
    role: AdminRole
  ): Promise<boolean> {
    try {
      if (ctx?.role !== AdminRole.master) {
        throw new ErrorWithProps("You are not authorized to change the role.");
      }

      if (ctx?.user === id) {
        throw new ErrorWithProps("You cannot change your role by yourself.");
      }

      let validRole = enumValidation(AdminRole, role);

      if (!validRole) {
        throw new ErrorWithProps("Invalid role.");
      }

      await revokeAllRefreshTokens(id, "admin");

      await AdminModel.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            role: role,
            lastLoggedOut: moment.utc().toDate(),
            updatedBy: ctx?.user,
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps("Something went wrong while changing the role.");
    }
  }

  async loginAdmin(email: string, context: Context) {
    try {
      // get user
      const user = await AdminModel.findOne({ email: email })
        .select("_id role status")
        .lean();

      // Rate limit checking
      const rlKey = `adminLogin:${email}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
      }

      if (!user) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps("User not exists!");
      }

      if (user?.status === AdminStatus.blocked) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps("Your account is blocked!");
      }

      const otpService = new OtpService();
      const genOtp = await otpService.generateOtp(email, "email");

      if (!genOtp) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      await resetRateLimit(rlKey);

      return genOtp;
    } catch (error) {
      // console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async verifyAdminLogin(
    email: string,
    otp: string,
    otpId: string,
    context: Context
  ) {
    try {
      // get user
      const user = await AdminModel.findOne({ email: email })
        .select("_id role status authTokenVersion")
        .lean();

      if (!user) {
        throw new ErrorWithProps("User not exists!");
      }

      // Rate limit checking
      const rlKey = `admin_login_otp:${email}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
      }

      if (user?.status === AdminStatus.blocked) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps("Your account is blocked!");
      }

      const otpService = new OtpService();
      const check = await otpService.validateOtp(email, otpId, otp);

      if (!check.status) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(check.message);
      }

      // Get device details
      const device = parseUserAgent(
        (context.req as FastifyRequest).headers["user-agent"]
      );
      const uniqueId = nanoid(8);

      // Finally update admins accessHistory and logged in time
      await AdminModel.updateOne(
        {
          email: email,
        },
        {
          $set: {
            lastLoggedIn: moment.utc().toDate(),
          },
          $addToSet: {
            accessHistory: {
              createdAt: moment.utc().toDate(),
              device: {
                type: device.deviceType,
                uniqueId: uniqueId,
                deviceName: device.browserName,
                deviceOS: device.deviceOS,
              },
            },
          },
        }
      );

      // Create auth tokens
      const { refreshToken, accessToken } = createAuthTokens({
        role: user.role,
        uniqueId,
        user: user._id,
        version: user.authTokenVersion ?? 0,
      });

      setServerCookie(CookieKeys.ACCESS_TOKEN, accessToken, context);
      setServerCookie(CookieKeys.REFRESH_TOKEN, refreshToken, context);
      setServerCookie(CookieKeys.UNIQUE_ID, uniqueId, context);

      // Save refresh token in redis
      storeRefreshToken(user._id, uniqueId, refreshToken, "admin");

      // Reset rate limit
      await resetRateLimit(rlKey);

      return true;
    } catch (error) {
      // console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async logoutAdmin(context: Context) {
    try {
      const admin = await AdminModel.findOne({ _id: context.user })
        .select("_id")
        .lean();

      if (!admin) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      const uniqueId = context.req.cookies[CookieKeys.UNIQUE_ID];
      if (uniqueId) {
        await revokeRefreshToken(admin._id.toString(), uniqueId, "admin");
      }

      await AdminModel.updateOne(
        {
          _id: context?.user,
        },
        {
          $set: {
            lastLoggedOut: moment.utc().toDate(),
          },
        }
      );

      clearServerCookie(CookieKeys.ACCESS_TOKEN, context);
      clearServerCookie(CookieKeys.REFRESH_TOKEN, context);
      clearServerCookie(CookieKeys.UNIQUE_ID, context);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getAllRestaurantUsers(filter: PaginatedFilter, page: number) {
    try {
      let customFilter = !!(
        (typeof filter?.field === "number" ||
          typeof filter?.field === "string") &&
        filter.value !== ""
      );

      const rowCount = 10;
      let matchingData: { [key: string]: any } = {};
      if (filter && customFilter) {
        let filterField = filter.field;
        // Master common value (string)
        if (
          filter?.field.includes("name") ||
          filter?.field.includes("addressLine1") ||
          filter?.field.includes("addressLine2") ||
          filter?.field.includes("city") ||
          filter?.field.includes("state") ||
          filter?.field.includes("postcode")
        ) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            if (filter?.field?.includes("name")) {
              filterField = `${filter.field}.value`;
            } else {
              filterField = `address.${filter?.field}.value`;
            }
            matchingData[filterField] = { $regex: `(?i)${filter.value}` };
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        } else if (
          filter?.field?.includes("accountPreferencesWhatsApp") ||
          filter?.field?.includes("accountPreferencesEmail")
        ) {
          if (filter?.field?.includes("accountPreferencesWhatsApp")) {
            filterField = "accountPreferences.whatsApp";
          } else {
            filterField = "accountPreferences.email";
          }
          matchingData[filterField] = filter.value;
        } else if (filter.field) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            matchingData[filter.field] = filter.value;
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        }
      } else {
        matchingData = {};
      }

      let users: User[];
      if (customFilter) {
        users = await UserModel.find(matchingData)
          .populate("businessInfo")
          .skip((page ?? 0) * rowCount)
          .limit(rowCount)
          .lean();
      } else {
        users = await UserModel.find({})
          .populate("businessInfo")
          .skip((page ?? 0) * rowCount)
          .limit(rowCount)
          .lean();
      }

      return users;
    } catch (error) {
      console.log(error);
      throw new ErrorWithProps(error);
    }
  }

  async getAllRestaurants(filter: PaginatedFilter, page: number) {
    try {
      let customFilter = !!(
        (typeof filter?.field === "number" ||
          typeof filter?.field === "string") &&
        filter.value !== ""
      );

      const rowCount = 10;
      let matchingData: { [key: string]: any } = {};
      if (filter && customFilter) {
        let filterField = filter.field;

        // Master common value (number)
        if (filter.field.includes("dineInCapacity")) {
          filterField = "dineInCapacity.value";
          switch (filter.operator) {
            case FilterOperatorsEnum.equalTo:
              matchingData[filterField] = { $eq: filter.value };
              break;
            case FilterOperatorsEnum.notEqualTo:
              matchingData[filterField] = { $ne: filter.value };
              break;
            case FilterOperatorsEnum.greaterThan:
              matchingData[filterField] = { $gt: filter.value };
              break;
            case FilterOperatorsEnum.greaterThanOrEqualTo:
              matchingData[filterField] = { $gte: filter.value };
              break;
            case FilterOperatorsEnum.lessThan:
              matchingData[filterField] = { $lt: filter.value };
              break;
            case FilterOperatorsEnum.lessThanOrEqualTo:
              matchingData[filterField] = { $lte: filter.value };
              break;
            default:
              throw new ErrorWithProps(`Invalid operator: ${filter.operator}`);
          }
        }
        // Master common value (string)
        else if (
          filter?.field.includes("name") ||
          filter?.field.includes("addressLine1") ||
          filter?.field.includes("addressLine2") ||
          filter?.field.includes("city") ||
          filter?.field.includes("state") ||
          filter?.field.includes("postcode")
        ) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            if (filter?.field?.includes("name")) {
              filterField = `${filter.field}.value`;
            } else {
              filterField = `address.${filter?.field}.value`;
            }
            matchingData[filterField] = { $regex: `(?i)${filter.value}` };
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        } else if (filter.field) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            matchingData[filter.field] = filter.value;
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        }
      } else {
        matchingData = {};
      }

      let restaurants;
      if (customFilter) {
        restaurants = await RestaurantModel.find(matchingData)
          .limit(rowCount)
          .skip((page ?? 0) * rowCount)
          .lean();
      } else {
        restaurants = await RestaurantModel.find({})
          .limit(rowCount)
          .skip((page ?? 0) * rowCount)
          .lean();
      }

      return restaurants;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async blockAdmin(id: string, updateStatus: AdminStatus, ctx: Context) {
    try {
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps("You are not authorized to block admin");
      }

      if (ctx?.user === id) {
        throw new ErrorWithProps("You can't block yourself");
      }

      const adminExist = await AdminModel.countDocuments({ _id: id }).lean();

      if (adminExist === 0) {
        throw new ErrorWithProps("Admin not exists");
      }

      let query: FilterQuery<Admin>;

      if (updateStatus === AdminStatus.active) {
        query = {
          status: updateStatus,
          unBlockedBy: ctx.user,
        };
      } else if (updateStatus === AdminStatus.blocked) {
        query = {
          status: updateStatus,
          blockedBy: ctx.user,
        };
        await revokeAllRefreshTokens(id, "admin");
      }

      await AdminModel.updateOne(
        {
          _id: id,
        },
        {
          $set: query,
        }
      );

      return true;
    } catch (error) {
      console.log(error.message.toString);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async changeUserStatus(id: string, ctx: Context) {
    try {
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      const user = await UserModel.findOne({ _id: id }).select("status").lean();

      if (!user) {
        throw new ErrorWithProps("User not exists");
      }

      let role: UserStatus;
      let restaurantStatus: RestaurantStatus;
      let commonStatus: StatusEnum;
      if (user?.status === UserStatus.active) {
        role = UserStatus.blocked;
        restaurantStatus = RestaurantStatus.blocked;
        commonStatus = StatusEnum.inactive;
      } else if (user?.status === UserStatus.blocked) {
        role = UserStatus.active;
        restaurantStatus = RestaurantStatus.active;
        commonStatus = StatusEnum.active;
      } else {
        throw new ErrorWithProps("Invalid status value.");
      }

      await RestaurantModel.updateMany(
        {
          user: id,
        },
        {
          $set: {
            status: restaurantStatus,
          },
        }
      );

      await MenuModel.updateMany(
        {
          user: id,
        },
        {
          $set: {
            status: commonStatus,
          },
        }
      );

      await CategoryModel.updateMany(
        {
          user: id,
        },
        {
          $set: {
            status: commonStatus,
          },
        }
      );

      // await ItemModel.updateMany({
      //   user:id
      // }, {
      //   $set: {
      //     status:
      //   }
      // })

      // integration status pending

      await UserModel.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            status: role,
            statusUpdatedBy: ctx.user,
            updatedAt: new Date(),
          },
        }
      );

      return true;
    } catch (error) {
      console.log(error);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async verifyUserDetails(id: string, ctx: Context) {
    try {
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      const user = await UserModel.findOne({
        _id: id,
        status: UserStatus.internalVerificationPending,
      })
        .select("_id restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps("User does not exists");
      }

      // If there is any restaurant details associated with the user then change the status to active else change the status to RestaurantOnboardingPending
      // if (user.restaurants.length > 0) {
      //   if (user.restaurants[0].status === RestaurantStatus.active) {
      //     finalStatus = UserStatus.active;
      //   }
      // }

      let finalStatus = UserStatus.active;
      if (
        user.restaurants.filter((el) => el.status === RestaurantStatus.active)
          .length > 0
      ) {
        finalStatus = UserStatus.active;
      } else {
        finalStatus = UserStatus.restaurantOnboardingPending;
      }

      await UserModel.updateOne(
        {
          _id: id,
          $or: [
            { status: UserStatus.internalVerificationPending },
            { status: UserStatus.onboardingPending },
          ],
        },
        {
          $set: {
            status: finalStatus,
            statusUpdatedBy: ctx.user,
          },
        }
      );

      await BusinessModel.updateOne(
        {
          "user._id": id,
        },
        {
          $set: {
            "user.status": finalStatus,
          },
        }
      );

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async rejectUserDetails(id: string, content: string, ctx: Context) {
    try {
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      const user = await UserModel.findOne({
        _id: id,
        status: UserStatus.internalVerificationPending,
      })
        .select("status")
        .lean();

      if (!user) {
        throw new ErrorWithProps("User not exists");
      }

      const adminDetails = await AdminModel.findOne({
        _id: ctx.user,
        role: AdminRole.master,
      })
        .lean()
        .select("name");

      if (!adminDetails) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      const rejectReason: RejectRecord = {
        admin: ctx.user,
        createdAt: moment.utc().toDate(),
        name: adminDetails.name,
        reason: content,
      };

      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.internalVerificationPending,
        },
        {
          $set: {
            status: UserStatus.onboardingPending,
            statusUpdatedBy: ctx.user,
          },
          $addToSet: {
            verificationRejections: rejectReason,
          },
        }
      );

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async changeRestaurantStatusAdmin(id: string, ctx: Context) {
    try {
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      const restaurant = await RestaurantModel.findOne({ _id: id })
        .select("status")
        .lean();

      if (!restaurant) {
        throw new ErrorWithProps("Restaurant  not exists");
      }

      let restaurantStatus: RestaurantStatus;
      let commonStatus: StatusEnum;
      if (restaurant?.status === RestaurantStatus.blocked) {
        restaurantStatus = RestaurantStatus.active;
        commonStatus = StatusEnum.active;
      } else if (restaurant?.status === RestaurantStatus.active) {
        restaurantStatus = RestaurantStatus.blocked;
        commonStatus = StatusEnum.inactive;
      }

      await UserModel.updateOne(
        {
          "restaurants._id": id,
        },
        {
          $set: {
            status: restaurantStatus,
            statusUpdatedBy: ctx.user,
            updatedAt: new Date(),
          },
        }
      );

      await RestaurantModel.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            status: restaurantStatus,
          },
        }
      );

      await MenuModel.updateMany(
        {
          restaurantId: id,
        },
        {
          $set: {
            status: commonStatus,
          },
        }
      );

      await CategoryModel.updateMany(
        {
          restaurantId: id,
        },
        {
          $set: {
            status: commonStatus,
          },
        }
      );

      // items
      await ItemModel.updateMany(
        {
          restaurantId: id,
        },
        {
          $set: {
            status: commonStatus,
          },
        }
      );

      // integration status pending

      return true;
    } catch (error) {
      console.log(error);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async deleteData() {
    try {
      await UserModel.deleteMany({});
      await BusinessModel.deleteMany({});
      await TeamsModel.deleteMany({});
      await RestaurantModel.deleteMany({});
      await TaxRateModel.deleteMany({});
      await MenuModel.deleteMany({});
      await CategoryModel.deleteMany({});
      await SubCategoryModel.deleteMany({});
      await ItemModel.deleteMany({});
      await ModifierGroupModel.deleteMany({});
      await ModifierModel.deleteMany({});
      await OtpModel.deleteMany({});
      await WaitListUserModel.deleteMany({});
      await CsvUploadModel.deleteMany({});
      await CsvUploadErrorModel.deleteMany({});
      await IntegrationModel.deleteMany({});
      await TwoFactorAuthModel.deleteMany({});
      await CloverCredentialModel.deleteMany({});
      return true;
    } catch (error) {
      throw error;
    }
  }

  async deleteMenuData() {
    try {
      await RestaurantModel.updateMany({ menus: [] });
      await MenuModel.deleteMany({});
      await CategoryModel.deleteMany({});
      await SubCategoryModel.deleteMany({});
      await ItemModel.deleteMany({});
      await ModifierGroupModel.deleteMany({});
      await ModifierModel.deleteMany({});
      await OtpModel.deleteMany({});
      await CsvUploadModel.deleteMany({});
      await CsvUploadErrorModel.deleteMany({});
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default AdminService;
