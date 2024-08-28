import { mongoose } from "@typegoose/typegoose";
import { ErrorWithProps } from "mercurius";
import moment from "moment";
import { isUserRole } from "../../../middlewares/loader";
import { CommunicationQueue, CommunicationQueueType } from "../../../queue";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import {
  createTeamVerificationToken,
  JwtTeamVerificationPayload,
  verifyTeamVerificationToken,
} from "../../../utils/jwt";
import {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
} from "../../../utils/rateLimit";
import {
  arraysAreEqual,
  arraysHaveCommonElement,
  isAlphanumeric,
  joiSchema,
} from "../../../utils/validations";
import { BusinessModel } from "../../business/schema/business.schema";
import { CategoryModel } from "../../categories/schema/category.schema";
import {
  CsvUploadErrorModel,
  CsvUploadModel,
} from "../../csv/schema/csv.schema";
import { ItemModel } from "../../items/schema/item.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { MastersService } from "../../masters/services/masters.service";
import { MenuModel } from "../../menu/schema/menu.schema";
import {
  ModifierGroupModel,
  ModifierModel,
} from "../../modifiers/schema/modifier.schema";
import { RestaurantStatus } from "../../restaurant/interfaces/restaurant.enums";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { SubCategoryModel } from "../../subCategories/schema/subCategories.schema";
import { TaxRateModel } from "../../taxRate/schema/taxRate.schema";
import { UserRole, UserStatus } from "../../user/interfaces/user.enum";
import { UserPermission } from "../../user/interfaces/user.objects";
import { UserModel } from "../../user/schema/user.schema";
import { TeamsOnboardingEnum } from "../interface/teams.enum";
import {
  AddTeamMemberInput,
  RestaurantSubuserInput,
  UpdateSubuserPermissionsInput,
  UpdateSubuserRoleInput,
} from "../interface/teams.input";
import { SubUser, TeamsModel } from "../schema/teams.schema";

export class TeamsService {
  async addTeamMember(input: AddTeamMemberInput, ctx: Context) {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const {
        email,
        phone,
        firstName,
        lastName,
        role,
        accountPreferences,
        restaurants,
        permissions,
      } = input;

      const prefsKey: string[] = Object.keys(accountPreferences);
      const prefsValidKey: string[] = ["whatsApp", "email"];
      if (!arraysAreEqual<string>(prefsKey, prefsValidKey)) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      const { error } = joiSchema.validate({
        email,
        phone,
        firstName,
        lastName,
      });

      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      // Check if any user is already there with same email or phone
      const checkSame = await UserModel.countDocuments({
        $or: [{ email: { $eq: email } }, { phone: { $eq: phone } }],
      }).lean();
      if (checkSame > 0) {
        throw new ErrorWithProps(
          "User already exist with same email or number"
        );
      }

      // Check if restaurant ids are valid and active
      if ((restaurants ?? []).length === 0) {
        throw new ErrorWithProps("Please assign at least one restaurant");
      }

      for (let i = 0; i < restaurants.length; i++) {
        const restaurant = restaurants[i];
        if (!isAlphanumeric(restaurant)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      const userRestaurants = await RestaurantModel.find({
        _id: { $in: restaurants },
        status: RestaurantStatus.active,
        address: { $ne: null },
        "address.city": { $ne: null },
      })
        .select("_id name status address")
        .lean();

      if ((restaurants ?? []).length !== userRestaurants.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Create an array with id field
      const userRestaurantsWithId = userRestaurants?.map((el) => ({
        ...el,
        id: el._id.toString(),
        city: el.address?.city,
      }));

      // Check if permissions array is valid or not
      const masterServices = new MastersService();
      permissions.forEach(async (permission) => {
        const check = await masterServices.checkPermissionExist(
          permission.id,
          permission.type
        );
        if (!check) {
          throw new ErrorWithProps(
            "Invalid permission type given, please try again!"
          );
        }
      });

      // Get business details id for the account
      const b = await BusinessModel.findOne({ "user._id": ctx.accountOwner })
        .select("_id")
        .lean();
      if (!b) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Finally create sub user
      const user = await UserModel.create({
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        role: role,
        creatorUser: ctx.user,
        restaurants: userRestaurantsWithId,
        permissions: permissions,
        businessInfo: b._id,
        accountPreferences: accountPreferences,
        status: UserStatus.subUserEmailVerificationPending,
      });

      await TeamsModel.findOneAndUpdate(
        {
          _id: ctx.accountOwner,
        },
        {
          $addToSet: {
            subUsers: {
              _id: user._id,
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              role: role,
              onboardingStatus: TeamsOnboardingEnum.verificationPending,
              accountPreferences: accountPreferences,
              restaurants: userRestaurantsWithId,
              permissions: permissions,
              createdAt: moment.utc().toDate(),
              updatedAt: moment.utc().toDate(),
            },
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      // Create verification token
      const token = createTeamVerificationToken({
        email: email,
        user: user._id,
      });

      const verificationLink = `${process.env.APP_URL}/email-verification/verify-user/${token}`;

      // Send email with verification link
      await CommunicationQueue.add({
        type: CommunicationQueueType.SendEmailVerificationLink,
        email: email,
        name: `${firstName} ${lastName}`,
        link: verificationLink,
      });

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async verifyTeamEmail(token: string) {
    try {
      // Check token
      if (!token) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const payload: JwtTeamVerificationPayload | null =
        await verifyTeamVerificationToken(token);

      if (!payload) {
        throw new ErrorWithProps(
          "Verification link is expired or invalid, please request a new link!"
        );
      }

      // Rate limit checking
      const rlKey = `team_verification:${payload.user}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
      }

      // Get the owner user
      const team = await TeamsModel.findOne({
        subUsers: { $elemMatch: { _id: payload.user } },
      })
        .select("_id")
        .lean();

      if (!team?._id) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user from the token is valid or not
      const user = await UserModel.findOne({
        _id: payload.user,
      })
        .select("creatorUser status")
        .lean();

      if (!user) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (user.status !== UserStatus.subUserEmailVerificationPending) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(
          "Your account is already verified, please login to access the account!"
        );
      }

      // Finally update the user status to active
      await UserModel.updateOne(
        {
          _id: payload.user,
          status: UserStatus.subUserEmailVerificationPending,
        },
        {
          $set: {
            status: UserStatus.active,
          },
        }
      );

      // Also update the status of user in teams model
      await TeamsModel.updateOne(
        {
          _id: team._id,
          subUsers: {
            $elemMatch: {
              _id: payload.user,
              status: UserStatus.subUserEmailVerificationPending,
            },
          },
        },
        {
          $set: {
            "subUsers.$.status": UserStatus.active,
          },
        }
      );

      // Reset rate limit
      await resetRateLimit(rlKey);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getTeamMembers(ctx: Context): Promise<SubUser[]> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Fetch team details from teams model by checking with ownerUserId
      const team = await TeamsModel.findOne({
        _id: ctx.accountOwner,
      })
        .select("subUsers")
        .lean();

      if (!team) {
        return [];
      }

      return team.subUsers;
    } catch (error) {
      throw error;
    }
  }

  async updateSubuserRole(input: UpdateSubuserRoleInput, ctx: Context) {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { id, role } = input;

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (!isUserRole(role)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if logged in user is not the same as id
      if (ctx.user === id && ctx.role !== UserRole.Owner) {
        throw new ErrorWithProps(
          "You cannot update your role, please ask your senior to do it!"
        );
      }

      // Check if user exists or not
      const memberUser = await UserModel.findOne({
        _id: id,
        status: UserStatus.active,
      })
        .select("role")
        .lean();

      if (!memberUser) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Check if role is same as db user or not now
      if (role === memberUser.role) {
        throw new ErrorWithProps(
          "Please assign a different role than the current one!"
        );
      }

      // Finally update the user role
      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.active,
          role: memberUser.role,
        },
        {
          $set: {
            role: role,
          },
        }
      );

      // Also update the status of user in teams model
      await TeamsModel.updateOne(
        {
          _id: ctx.accountOwner,
          subUsers: {
            $elemMatch: {
              _id: id,
              status: UserStatus.active,
              role: memberUser.role,
            },
          },
        },
        {
          $set: {
            "subUsers.$.role": role,
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateSubuserPermissions(
    input: UpdateSubuserPermissionsInput,
    ctx: Context
  ) {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { id, permissions } = input;

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if permissions array is valid or not
      const masterServices = new MastersService();
      permissions.forEach(async (permission) => {
        const check = await masterServices.checkPermissionExist(
          permission.id,
          permission.type
        );
        if (!check) {
          throw new ErrorWithProps(
            "Invalid permission type given, please try again!"
          );
        }
      });

      // Check if logged in user is not the same as id
      if (ctx.user === id && ctx.role !== UserRole.Owner) {
        throw new ErrorWithProps(
          "You cannot update your permissions, please ask your senior to do it!"
        );
      }

      // Check if user exists or not
      const memberUser = await UserModel.findOne({
        _id: id,
        status: UserStatus.active,
      })
        .select("permissions")
        .lean();

      if (!memberUser) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Check if permissions is same as db or not
      if (arraysAreEqual<UserPermission>(memberUser.permissions, permissions)) {
        throw new ErrorWithProps(
          "Please choose something different than the current one to update!"
        );
      }

      // Finally update the user permissions
      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.active,
        },
        {
          $set: {
            permissions: permissions,
          },
        }
      );

      // Also update the permissions of user in teams model
      await TeamsModel.updateOne(
        {
          _id: ctx.accountOwner,
          subUsers: {
            $elemMatch: {
              _id: id,
              status: UserStatus.active,
            },
          },
        },
        {
          $set: {
            permissions: permissions,
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async addRestaurantSubuser(input: RestaurantSubuserInput, ctx: Context) {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { id, restaurants } = input;

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if logged in user is not the same as id
      if (ctx.user === id && ctx.role !== UserRole.Owner) {
        throw new ErrorWithProps(
          "You cannot update your permissions, please ask your senior to do it!"
        );
      }

      // Check if restaurant ids are valid and active
      if ((restaurants ?? []).length === 0) {
        throw new ErrorWithProps("Please provide at least one restaurant");
      }

      for (let i = 0; i < restaurants.length; i++) {
        const restaurant = restaurants[i];
        if (!isAlphanumeric(restaurant)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      const userRestaurants = await RestaurantModel.find({
        _id: { $in: restaurants },
        status: RestaurantStatus.active,
        address: { $ne: null },
        "address.city": { $ne: null },
      })
        .select("_id name status address")
        .lean();

      if ((restaurants ?? []).length !== userRestaurants.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Create an array with id field
      const userRestaurantsWithId = userRestaurants?.map((el) => ({
        ...el,
        id: el._id.toString(),
        city: el.address?.city,
      }));

      // Check if user exists or not
      const memberUser = await UserModel.findOne({
        _id: id,
        status: UserStatus.active,
      })
        .select("restaurants")
        .lean();

      if (!memberUser) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Check if restaurants is same as db or not
      if (
        arraysHaveCommonElement<string>(
          memberUser.restaurants.map((el) => el.id),
          restaurants
        )
      ) {
        throw new ErrorWithProps(
          "Please choose restaurants which are not added already!"
        );
      }

      // Finally update the user permissions
      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.active,
        },
        {
          $addToSet: {
            restaurants: { $each: userRestaurantsWithId },
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async removeRestaurantSubuser(input: RestaurantSubuserInput, ctx: Context) {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { id, restaurants } = input;

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if logged in user is not the same as id
      if (ctx.user === id && ctx.role !== UserRole.Owner) {
        throw new ErrorWithProps(
          "You cannot update your permissions, please ask your senior to do it!"
        );
      }

      // Check if restaurant ids are valid and active
      if ((restaurants ?? []).length === 0) {
        throw new ErrorWithProps("Please provide at least one restaurant");
      }

      for (let i = 0; i < restaurants.length; i++) {
        const restaurant = restaurants[i];
        if (!isAlphanumeric(restaurant)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      const userRestaurants = await RestaurantModel.find({
        _id: { $in: restaurants },
      })
        .select("_id")
        .lean();

      if ((restaurants ?? []).length !== userRestaurants.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exists or not
      const memberUser = await UserModel.findOne({
        _id: id,
        status: UserStatus.active,
      })
        .select("restaurants")
        .lean();

      if (!memberUser) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Check if permissions is same as db or not
      if (
        !arraysHaveCommonElement<string>(
          memberUser.restaurants.map((el) => el.id),
          restaurants
        )
      ) {
        throw new ErrorWithProps(
          "Please choose restaurants which exists for the user!"
        );
      }

      // Finally update the user permissions
      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.active,
        },
        {
          $pull: {
            restaurants: {
              $elemMatch: { _id: { $in: userRestaurants.map((el) => el._id) } },
            },
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async deleteTeamMember(id: string, ctx: Context) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UserManagement
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Sanity check
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if id is the owner's id
      if (ctx.accountOwner === id) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if logged in user is not the same as id
      if (ctx.user === id) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if user exists or not
      const memberUser = await UserModel.findOne({
        _id: id,
      })
        .select("_id")
        .lean();

      if (!memberUser) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Fetch team details from teams model by checking with ownerUserId
      const team = await TeamsModel.findOne({
        _id: ctx.accountOwner,
      })
        .select("subUsers")
        .lean();

      if (!team) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if user is actually present in the subusers list
      if (!team.subUsers.map((e) => e._id.toString()).includes(id)) {
        throw new ErrorWithProps("Invalid team member, please try again!");
      }

      // Finally remove this user from user model and transfer it's refrences from all other models to account owner's
      // Perform all the operations inside mongodb's transaction for atomicity
      await RestaurantModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await MenuModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await CategoryModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await ItemModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await SubCategoryModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await CsvUploadModel.updateMany(
        {
          user: id,
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await CsvUploadErrorModel.updateMany(
        {
          user: id,
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await TaxRateModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await ModifierGroupModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await ModifierModel.updateMany(
        {
          $or: [{ user: id }, { updatedBy: id }],
        },
        [
          {
            $set: {
              user: {
                $cond: {
                  if: { $eq: ["$user", id] },
                  then: ctx.accountOwner,
                  else: "$user",
                },
              },
              updatedBy: {
                $cond: {
                  if: { $eq: ["$updatedBy", id] },
                  then: ctx.accountOwner,
                  else: "$updatedBy",
                },
              },
            },
          },
        ],
        { session: dbSession }
      );

      await TeamsModel.updateOne(
        {
          _id: ctx.accountOwner,
        },
        {
          $pull: {
            subUsers: { _id: id },
          },
        },
        { session: dbSession }
      );

      await UserModel.deleteOne(
        {
          _id: id,
        },
        { session: dbSession }
      );

      await dbSession.commitTransaction();
      return true;
    } catch (error) {
      await dbSession.abortTransaction();
      throw new ErrorWithProps(error.message.toString());
    } finally {
      await dbSession.endSession();
    }
  }
}
