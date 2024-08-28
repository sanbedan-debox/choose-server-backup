import { mongoose } from "@typegoose/typegoose";
import { ErrorWithProps } from "mercurius";
import moment from "moment";
import { FilterQuery, UpdateQuery } from "mongoose";
import { nanoid } from "nanoid";
import { getClientIp } from "request-ip";
import Context from "../../../types/context.type";
import {
  clearServerCookie,
  CookieKeys,
  setServerCookie,
} from "../../../utils/cookie";
import {
  maskEIN,
  maskEmail,
  maskPhone,
  parseUserAgent,
  userHasPermission,
} from "../../../utils/helper";
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
import {
  arraysAreEqual,
  isAlphanumeric,
  joiSchema,
} from "../../../utils/validations";
import { AdminRole } from "../../admin/interface/admin.interface";
import { AdminModel } from "../../admin/schema/admin.schema";
import { Business, BusinessModel } from "../../business/schema/business.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { MastersService } from "../../masters/services/masters.service";
import { TwoFactorAuthModel } from "../../otp/schema/two-factor-auth.schema";
import OtpService from "../../otp/services/otp.service";
import TwoFactorAuthService from "../../otp/services/two-factor-auth.service";
import { RestaurantStatus } from "../../restaurant/interfaces/restaurant.enums";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { Teams, TeamsModel } from "../../teams/schema/teams.schema";
import { isPhoneNumberOrEmail } from "../helper/user.helper";
import { UserLoginType, UserRole, UserStatus } from "../interfaces/user.enum";
import {
  RejectUserDetailsInput,
  UpdateUserInput,
  UserLoginVerificationInput,
  UserSignupInput,
  UserSignupVerificationInput,
  UserStatusChangeInput,
} from "../interfaces/user.input";
import { RejectRecord, RestaurantInfo } from "../interfaces/user.objects";
import { User, UserModel } from "../schema/user.schema";

class UserService {
  async meUser(ctx: Context): Promise<User> {
    try {
      const me = await UserModel.findOne({ _id: ctx.user }).lean();

      if (!me) {
        return null;
      }

      return { ...me, email: maskEmail(me.email), phone: maskPhone(me.phone) };
    } catch (error) {
      throw error;
    }
  }

  async userSignup(input: UserSignupInput): Promise<string> {
    try {
      // Check input values
      const { email, phone } = input;

      const { error } = joiSchema.validate({
        email,
        phone,
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
          "User already exist with given email or number"
        );
      }

      // Finally send otp to the mail id
      const otpService = new OtpService();
      const genOtp = await otpService.generateOtp(email, "email");

      if (!genOtp) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      return genOtp;
    } catch (error) {
      throw error;
    }
  }

  async userSignupVerification(
    input: UserSignupVerificationInput,
    context: Context
  ): Promise<boolean> {
    try {
      // Check input values
      const {
        email,
        phone,
        firstName,
        lastName,
        otp,
        otpId,
        accountPreferences,
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
        otp,
      });

      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      // Rate limit checking
      const rlKey = `signup_otp:${email}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
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

      // Finally verify the OTP and create account
      const otpService = new OtpService();
      const verifyOtp = await otpService.validateOtp(email, otpId, otp);

      if (!verifyOtp.status) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(verifyOtp.message);
      }

      // Create permissions list for owner
      const mastersService = new MastersService();
      const permissions = await mastersService.getAllPermissions();
      const ownerPermissions: {
        id: string;
        type: PermissionTypeEnum;
        status: boolean;
      }[] = [];
      permissions.forEach((permission) => {
        ownerPermissions.push({
          id: permission._id.toString(),
          type: permission.type,
          status: permission.preselect.includes(UserRole.Owner),
        });
      });

      // Get device details
      const device = parseUserAgent(context.req.headers["user-agent"]);
      const uniqueId = nanoid(8);

      // Finally create user in db
      const user = await UserModel.create({
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        status: UserStatus.onboardingPending,
        role: UserRole.Owner,
        accountPreferences: accountPreferences,
        permissions: ownerPermissions,
        lastLoggedIn: moment.utc().toDate(),
        accessHistory: [
          {
            createdAt: moment.utc().toDate(),
            device: {
              type: device.deviceType,
              uniqueId: uniqueId,
              deviceName: device.browserName,
              deviceOS: device.deviceOS,
            },
          },
        ],
      });

      // Create auth tokens
      const { refreshToken, accessToken } = createAuthTokens({
        role: user.role,
        uniqueId,
        user: user._id,
        version: user.authTokenVersion,
      });

      // Save token in cookie
      setServerCookie(CookieKeys.ACCESS_TOKEN, accessToken, context);
      setServerCookie(CookieKeys.REFRESH_TOKEN, refreshToken, context);
      setServerCookie(CookieKeys.UNIQUE_ID, uniqueId, context);

      // Save refresh token in redis
      storeRefreshToken(user._id, uniqueId, refreshToken, "user");

      // Reset rate limit
      await resetRateLimit(rlKey);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async userLogin(input: string): Promise<string> {
    try {
      // Check input values
      const { status: emailOrNumberStatus, value: emailOrNumber } =
        isPhoneNumberOrEmail(input);

      if (
        emailOrNumberStatus === UserLoginType.Invalid ||
        emailOrNumber === null ||
        emailOrNumber === ""
      ) {
        throw new ErrorWithProps("Please enter a valid email or mobile number");
      }

      let query: FilterQuery<User>;

      if (
        emailOrNumberStatus === UserLoginType.Email &&
        emailOrNumber !== null
      ) {
        query = {
          email: emailOrNumber,
        };
      } else if (
        emailOrNumberStatus === UserLoginType.Phone &&
        emailOrNumber !== null
      ) {
        query = {
          phone: emailOrNumber,
        };
      }

      // Rate limit checking
      const rlKey = `login:${input}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
      }

      // Check if user exists
      const checkUser = await UserModel.findOne(query)
        .select("_id enable2FA")
        .lean();
      if (!checkUser) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(
          "User not found please provide valid details and try again!"
        );
      }

      // Check if 2FA is enabled or not
      if (checkUser.enable2FA) {
        // Reset rate limit
        await resetRateLimit(rlKey);

        // Return empty string
        return "";
      }

      // Finally send otp to email or phone number
      const otpService = new OtpService();
      const genOtp = await otpService.generateOtp(
        input,
        emailOrNumberStatus === UserLoginType.Email ? "email" : "number"
      );

      if (!genOtp) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      // Reset rate limit
      await resetRateLimit(rlKey);

      return genOtp;
    } catch (error) {
      throw error;
    }
  }

  async userLoginVerification(
    input: UserLoginVerificationInput,
    context: Context
  ): Promise<boolean> {
    try {
      const { emailOrNumber, otp, otpId } = input;

      // Check input values
      const { error: otpInputError } = joiSchema.validate({ otp: otp });

      if (otpInputError) {
        throw new ErrorWithProps(otpInputError.message);
      }

      const { status: emailOrNumberStatus, value: sanitizedEmailOrNumber } =
        isPhoneNumberOrEmail(emailOrNumber);

      if (
        emailOrNumberStatus === UserLoginType.Invalid ||
        sanitizedEmailOrNumber === null ||
        sanitizedEmailOrNumber === ""
      ) {
        throw new ErrorWithProps("Please enter a valid email or mobile number");
      }

      // Rate limit checking
      const rlKey = `login_otp:${sanitizedEmailOrNumber}`;
      const canProceed = await checkRateLimit(rlKey);
      if (!canProceed) {
        throw new ErrorWithProps("Too many requests, please try again later!");
      }

      // Check if OTP is valid or not
      let query: FilterQuery<User> = {
        status: { $ne: UserStatus.subUserEmailVerificationPending },
      };

      if (emailOrNumberStatus === UserLoginType.Email) {
        query = {
          email: sanitizedEmailOrNumber,
        };
      } else if (emailOrNumberStatus === UserLoginType.Phone) {
        query = {
          phone: sanitizedEmailOrNumber,
        };
      }

      // Check if user exists or not
      const user = await UserModel.findOne(query)
        .select("_id status role restaurants enable2FA authTokenVersion")
        .lean();

      if (!user) {
        await incrementRateLimit(rlKey);
        throw new ErrorWithProps(
          "User not found, please try again with valid credentials!"
        );
      }

      let isVerified = false;

      // 2FA Flow
      if (user.enable2FA) {
        // Check if user exist in 2FA model
        const twoFactorAuth = await TwoFactorAuthModel.findOne({
          user: user._id.toString(),
        }).lean();
        if (!twoFactorAuth) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        // Get the secret and verify it
        const twoFactorAuthService = new TwoFactorAuthService();
        const isValid = await twoFactorAuthService.verifyAuthCode(
          twoFactorAuth.secret,
          otp
        );

        if (!isValid) {
          throw new ErrorWithProps("Please enter valid code and try again!");
        }

        isVerified = true;
      } else {
        // Normal OTP Flow
        const otpService = new OtpService();
        const otpValid = await otpService.validateOtp(
          sanitizedEmailOrNumber,
          otpId,
          otp
        );

        if (!otpValid.status) {
          await incrementRateLimit(rlKey);
          throw new ErrorWithProps(otpValid.message);
        }

        isVerified = true;
      }

      if (!isVerified) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Get device details
      const device = parseUserAgent(context.req.headers["user-agent"]);
      const uniqueId = nanoid(8);

      // Finally update users accessHistory and logged in time
      await UserModel.updateOne(query, {
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
      });

      // Create auth tokens
      const { refreshToken, accessToken } = createAuthTokens({
        role: user.role,
        uniqueId,
        user: user._id,
        version: user.authTokenVersion ?? 0,
      });

      // Save token in cookie
      if (user.restaurants.length > 0) {
        setServerCookie(
          CookieKeys.RESTAURANT_ID,
          user.restaurants[0].id,
          context
        );
      }
      setServerCookie(CookieKeys.ACCESS_TOKEN, accessToken, context);
      setServerCookie(CookieKeys.REFRESH_TOKEN, refreshToken, context);
      setServerCookie(CookieKeys.UNIQUE_ID, uniqueId, context);

      // Save refresh token in redis
      storeRefreshToken(user._id, uniqueId, refreshToken, "user");

      // Reset rate limit
      await resetRateLimit(rlKey);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async userLogout(context: Context) {
    try {
      // Check if ther user present in context is valid or not
      const user = await UserModel.findOne({ _id: context.user })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      // Get the unique Id from cookie and revoke the refresh token
      const uniqueId = context.req.cookies[CookieKeys.UNIQUE_ID];
      if (uniqueId) {
        await revokeRefreshToken(user._id.toString(), uniqueId, "user");
      }

      // Finally update the logout time and clear the cookies
      await UserModel.updateOne(
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
      clearServerCookie(CookieKeys.RESTAURANT_ID, context);
      clearServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, context);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async userLogoutFromEverywhere(context: Context) {
    try {
      // TODO: Add MFA or OTP check before completing this action

      // Check if ther user present in context is valid or not
      const user = await UserModel.findOne({ _id: context.user })
        .select("_id role restaurants")
        .lean();

      if (!user) {
        console.log("here0");
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      // Get the unique Id and resto Id from cookie and revoke all other refresh token
      const restoId = context.req.cookies[CookieKeys.RESTAURANT_ID];
      if (!restoId) {
        console.log("here1");
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }
      const uniqueId = context.req.cookies[CookieKeys.UNIQUE_ID];
      if (!uniqueId) {
        console.log("here2");
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      await revokeAllRefreshTokens(user._id.toString(), "user", uniqueId);

      // Finally update the logout time and clear the cookies
      const updatedUser = await UserModel.findOneAndUpdate(
        {
          _id: context?.user,
        },
        {
          $set: {
            lastLoggedOut: moment.utc().toDate(),
          },
          $inc: { authTokenVersion: 1 },
        },
        { new: true }
      ).select("_id authTokenVersion");

      // Create auth tokens
      const { refreshToken, accessToken } = createAuthTokens({
        role: user.role,
        uniqueId,
        user: user._id,
        version: updatedUser.authTokenVersion ?? 0,
      });

      // Save token in cookie
      setServerCookie(
        CookieKeys.RESTAURANT_ID,
        user.restaurants[0].id,
        context
      );
      setServerCookie(CookieKeys.ACCESS_TOKEN, accessToken, context);
      setServerCookie(CookieKeys.REFRESH_TOKEN, refreshToken, context);
      setServerCookie(CookieKeys.UNIQUE_ID, uniqueId, context);
      clearServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, context);

      storeRefreshToken(updatedUser._id, uniqueId, refreshToken, "user");

      return true;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async verifyUserDetails(id: string, ctx: Context): Promise<boolean> {
    try {
      // Check if the logged in admin is a master user or not
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      // Check the input value
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Check if user exists or not
      const user = await UserModel.findOne({
        _id: id,
        status: UserStatus.internalVerificationPending,
      })
        .select("_id restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Check if user has already added restaurant details or not
      let finalStatus = UserStatus.active;
      if (
        user.restaurants.filter((el) => el.status === RestaurantStatus.active)
          .length <= 0
      ) {
        finalStatus = UserStatus.restaurantOnboardingPending;
      }

      // Finally update the status in user model
      await UserModel.updateOne(
        {
          _id: id,
          status: UserStatus.internalVerificationPending,
        },
        {
          $set: {
            status: finalStatus,
            statusUpdatedBy: ctx.user,
          },
        }
      );

      // Also update the status in business model for user
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

  async rejectUserDetails(
    input: RejectUserDetailsInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      const { id, content } = input;

      // Check if the logged in admin is a master user or not
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      // Check the input value
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      const { error } = joiSchema.validate({ content: content });

      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      // Check if user exists or not
      const user = await UserModel.findOne({
        _id: id,
        status: UserStatus.internalVerificationPending,
      })
        .select("_id restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Get logged in admin details
      const adminDetails = await AdminModel.findOne({
        _id: ctx.user,
        role: AdminRole.master,
      })
        .select("name")
        .lean();

      if (!adminDetails) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Create the reject record
      const rejectReason: RejectRecord = {
        admin: ctx.user,
        createdAt: moment.utc().toDate(),
        name: adminDetails.name,
        reason: content,
      };

      // Finally update the status in user model
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

      // Also update the status in business model for user
      await BusinessModel.updateOne(
        {
          "user._id": id,
        },
        {
          $set: {
            "user.status": UserStatus.onboardingPending,
          },
        }
      );

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async changeUserStatus(
    input: UserStatusChangeInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      const { id, block } = input;

      // Check if the logged in admin is a master user or not
      if (ctx.role !== AdminRole.master) {
        throw new ErrorWithProps(
          "You are not authorized to perform this action"
        );
      }

      // Check the input value
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Check if user exists or not
      const user = await UserModel.findOne({
        _id: id,
        status: block ? UserStatus.active : UserStatus.blocked,
      })
        .select("_id businessInfo")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Get logged in admin details
      const adminDetails = await AdminModel.findOne({
        _id: ctx.user,
        role: AdminRole.master,
      })
        .select("name")
        .lean();

      if (!adminDetails) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Get accountOwner
      let accountOwnerId = "";

      const team = await TeamsModel.findOne({
        subUsers: { $elemMatch: { _id: id } },
      })
        .select("_id")
        .lean();

      if (team?._id) {
        accountOwnerId = team._id.toString();
      } else {
        // Check if logged in user is only the account owner or not
        const checkTeam = await TeamsModel.findOne({ _id: id })
          .select("_id")
          .lean();

        if (checkTeam) {
          accountOwnerId = checkTeam._id.toString();
        } else {
          // Team is not present now
          accountOwnerId = id;
        }
      }

      if (accountOwnerId === "") {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // TODO: Implement logging of the request ip who blocked the user
      const ip = getClientIp(ctx.req);
      console.log(ip);

      // Finally update the status in user model
      await UserModel.updateOne(
        {
          _id: id,
          status: block ? UserStatus.active : UserStatus.blocked,
        },
        {
          $set: {
            status: block ? UserStatus.blocked : UserStatus.active,
            statusUpdatedBy: ctx.user,
          },
        }
      );

      // Also update the status in business model for user
      await BusinessModel.updateOne(
        {
          _id: user.businessInfo,
        },
        {
          $set: {
            "user.status": block ? UserStatus.blocked : UserStatus.active,
          },
        }
      );

      // Also update the status in teams model
      await TeamsModel.updateOne(
        {
          _id: accountOwnerId,
          subUsers: { $elemMatch: { _id: id } },
        },
        {
          $set: {
            "subUsers.$.status": block ? UserStatus.blocked : UserStatus.active,
          },
        }
      );

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async getUser(id: string, ctx: Context): Promise<User> | null {
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

      // Check the input value
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later"
        );
      }

      // Check if id is one of the team member
      const team = await TeamsModel.findOne({
        _id: ctx.accountOwner,
      })
        .select("subUsers")
        .lean();

      if (!team) {
        return null;
      }

      const teamMembers = team.subUsers.map((e) => e._id.toString());

      if (!teamMembers.includes(id)) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if user exists or not
      const user = await UserModel.findOne({
        _id: id,
      })
        .select("_id role permissions restaurants")
        .lean();

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async userBusinessDetails(ctx: Context): Promise<Business> {
    try {
      // Check if user in context actually exists
      const user = await UserModel.findOne({
        _id: ctx?.user,
        businessInfo: { $ne: null },
      })
        .populate({
          path: "businessInfo",
          strictPopulate: true,
          select: "-user -updatedBy -createdAt -updatedAt",
        })
        .select("businessInfo")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      // Check if business info is properly populated or not
      if (user.businessInfo instanceof mongoose.Types.ObjectId) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      const businessInfo = user.businessInfo as Business;

      let businessData: Business = {
        ...businessInfo,
        ein: maskEIN(businessInfo.ein),
      };

      return businessData;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async userRestaurants(ctx: Context): Promise<RestaurantInfo[]> {
    try {
      // Check if user in context actually exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        "restaurants.status": RestaurantStatus.active,
      })
        .select("restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps(
          "Something went wrong, please try again later!"
        );
      }

      return (
        user.restaurants.map((el) => ({
          _id: el._id,
          id: el.id,
          name: el.name,
          status: el.status,
          city: el.city,
        })) ?? []
      );
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async userRestaurantsPending(ctx: Context): Promise<RestaurantInfo[]> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.AddRestaurant
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Find all the restaurants which are pending for this user
      const restaurants = await RestaurantModel.find({
        user: ctx.user,
        status: RestaurantStatus.onboardingPending,
      })
        .select("_id status name city")
        .lean();

      return (
        restaurants.map((el) => ({
          _id: el._id ?? "",
          id: el._id.toString() ?? "",
          name: el.name,
          status: el.status ?? RestaurantStatus.active,
          city: el.address?.city,
        })) ?? []
      );
    } catch (error) {
      throw error;
    }
  }

  async updateUserDetails(input: UpdateUserInput, ctx: Context) {
    try {
      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UpdateBusiness
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { email, firstName, lastName, phone } = input;

      // Check if user exist
      const userCheck = await UserModel.countDocuments({
        _id: ctx.user,
      }).lean();
      if (userCheck !== 1) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Create update query
      let mainUpdQuery: UpdateQuery<User> = {
        updatedBy: ctx.user,
      };
      let teamUpdQuery: UpdateQuery<Teams> = {};
      let isSubuser = true;

      // Check if the user is owner user or sub-user
      if (ctx.user === ctx.accountOwner) {
        isSubuser = false;
      }

      if (firstName) {
        const { error } = joiSchema.validate({ firstName });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (isSubuser) {
          teamUpdQuery = { ...teamUpdQuery, "subUsers.$.firstName": firstName };
        }

        mainUpdQuery.firstName = firstName;
      }

      if (email) {
        const { error } = joiSchema.validate({ email });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (isSubuser) {
          teamUpdQuery = { ...teamUpdQuery, "subUsers.$.email": email };
        }

        mainUpdQuery.email = email;
      }

      if (lastName) {
        const { error } = joiSchema.validate({ lastName });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (isSubuser) {
          teamUpdQuery = { ...teamUpdQuery, "subUsers.$.lastName": lastName };
        }

        mainUpdQuery.lastName = lastName;
      }

      if (phone) {
        const { error } = joiSchema.validate({ phone });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (isSubuser) {
          teamUpdQuery = { ...teamUpdQuery, "subUsers.$.phone": phone };
        }

        mainUpdQuery.phone = phone;
      }

      // Finally update the details in both user model and teams model
      await UserModel.updateOne(
        {
          _id: ctx.user,
        },
        { $set: mainUpdQuery }
      );

      if (Object.keys(teamUpdQuery).length > 0) {
        await TeamsModel.updateOne(
          {
            _id: ctx.accountOwner,
            subUsers: { $elemMatch: { _id: ctx.user } },
          },
          { $set: teamUpdQuery }
        );
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async enable2FA(ctx: Context) {
    try {
      // TODO: Add expiration of secret logic, also check implementation of backup codes

      // Check if user exists and 2FA is turned off
      const userCheck = await UserModel.findOne({
        _id: ctx.user,
        $or: [{ enable2FA: false }, { enable2FA: null }],
      })
        .select("email")
        .lean();
      if (!userCheck) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user does not exist in 2FA model
      const checkIn2FA = await TwoFactorAuthModel.countDocuments({
        user: ctx.user,
      }).lean();
      if (checkIn2FA !== 0) {
        await TwoFactorAuthModel.deleteOne({ user: ctx.user });
        throw new ErrorWithProps(
          "You have already requested for enabling 2FA, please try again after few minutes!"
        );
      }

      // Create a secret and save in 2FA model as encrypted value and send the encrypted value back to client
      const twoFactorAuthService = new TwoFactorAuthService();
      const { secret, qrImage } = await twoFactorAuthService.generateSecret(
        userCheck.email
      );

      await TwoFactorAuthModel.create({ secret, user: ctx.user });

      if (!secret) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Finally send the qr code image link
      return qrImage;
    } catch (error) {
      throw error;
    }
  }

  async verify2FASetup(authCode: string, ctx: Context) {
    try {
      // Check if user exists and 2FA is turned off
      const userCheck = await UserModel.countDocuments({
        _id: ctx.user,
        $or: [{ enable2FA: false }, { enable2FA: null }],
      }).lean();
      if (userCheck !== 1) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exist in 2FA model
      const twoFactorAuth = await TwoFactorAuthModel.findOne({
        user: ctx.user,
      }).lean();
      if (!twoFactorAuth) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Get the secret and verify it
      const twoFactorAuthService = new TwoFactorAuthService();
      const isValid = await twoFactorAuthService.verifyAuthCode(
        twoFactorAuth.secret,
        authCode
      );

      if (!isValid) {
        throw new ErrorWithProps(
          "Invalid verification code, please try again!"
        );
      }

      // Finally enable2fa in users model
      await UserModel.updateOne(
        { _id: ctx.user },
        { $set: { enable2FA: true } }
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  async disable2FA(authCode: string, ctx: Context) {
    try {
      // Check if user exists and 2FA is turned on
      const userCheck = await UserModel.countDocuments({
        _id: ctx.user,
        enable2FA: true,
      }).lean();
      if (userCheck !== 1) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exist in 2FA model
      const twoFactorAuth = await TwoFactorAuthModel.findOne({
        user: ctx.user,
      }).lean();
      if (!twoFactorAuth) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Get the secret and verify it
      const twoFactorAuthService = new TwoFactorAuthService();
      const isValid = await twoFactorAuthService.verifyAuthCode(
        twoFactorAuth.secret,
        authCode
      );

      if (!isValid) {
        throw new ErrorWithProps(
          "Invalid verification code, please try again!"
        );
      }

      // Finally set enable2FA to false in users model and remove secret from two-factor-auth model
      const updUser = UserModel.updateOne(
        { _id: ctx.user },
        { $set: { enable2FA: false } }
      );

      const del2FA = TwoFactorAuthModel.deleteOne({ user: ctx.user });

      await Promise.all([updUser, del2FA]);

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;
