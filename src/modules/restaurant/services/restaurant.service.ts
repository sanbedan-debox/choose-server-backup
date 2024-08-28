import { ErrorWithProps } from "mercurius";
import mongoose, { UpdateQuery } from "mongoose";
import Context from "../../../types/context.type";
import {
  clearServerCookie,
  CookieKeys,
  getServerCookie,
  setServerCookie,
} from "../../../utils/cookie";
import { userHasPermission } from "../../../utils/helper";
import {
  arraysHaveCommonElement,
  availabilityValidation,
  enumArrayValidation,
  enumValidation,
  isAlphanumeric,
  validateUSAddress,
  validateWebSiteURL,
} from "../../../utils/validations";
import { BusinessModel } from "../../business/schema/business.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { Teams, TeamsModel } from "../../teams/schema/teams.schema";
import { UserStatus } from "../../user/interfaces/user.enum";
import { User, UserModel } from "../../user/schema/user.schema";
import {
  BeverageCategory,
  FoodType,
  MeatType,
  RestaurantCategory,
  RestaurantStatus,
  RestaurantType,
} from "../interfaces/restaurant.enums";
import { RestaurantDetailsInput } from "../interfaces/restaurant.input";
import { Restaurant, RestaurantModel } from "../schema/restaurant.schema";

class RestaurantService {
  async restaurantOnboarding(
    input: RestaurantDetailsInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      // Get restaurant id from cookie if present
      const id = getServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, ctx);

      // Check id value
      if (id && !isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        $or: [
          { status: UserStatus.internalVerificationPending },
          { status: UserStatus.restaurantOnboardingPending },
          { status: UserStatus.active },
        ],
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.AddRestaurant
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const {
        name,
        address,
        availability,
        category,
        beverageCategory,
        meatType,
        foodType,
        type,
        website,
        dineInCapacity,
        brandingLogo,
        socialInfo,
        timezone,
      } = input;

      // Validate all the input values
      if (name) {
        // TODO: Think if we want to keep restaurant name unique in user account or on global level
        const sameRestoName = await RestaurantModel.countDocuments({
          name: name,
          status: RestaurantStatus.active,
        });

        if (sameRestoName > 0) {
          throw new ErrorWithProps(
            "Restaurant name is already taken, please choose a different name"
          );
        }
      }

      if (address && Object.keys(address).length !== 0) {
        const addressIsValid = validateUSAddress(address);
        if (!addressIsValid) {
          throw new ErrorWithProps(
            "Please provide valid address details and try again!"
          );
        }
      }

      if (availability && availability.length !== 0) {
        const availabilityCheck = availabilityValidation(availability);

        if (!availabilityCheck.success) {
          throw new ErrorWithProps(availabilityCheck.error);
        }
      }

      if (category && category?.length !== 0) {
        const categoryValidation = enumArrayValidation(
          RestaurantCategory,
          category
        );

        if (!categoryValidation?.success) {
          throw new ErrorWithProps(categoryValidation?.error);
        }

        if (
          category.includes(RestaurantCategory.DineIn) ||
          category.includes(RestaurantCategory.PremiumDineIn)
        ) {
          if (!dineInCapacity) {
            throw new ErrorWithProps(
              "Dine-in capacity must be present for dine-in restaurants"
            );
          }
          if (dineInCapacity === 0 || !dineInCapacity) {
            throw new ErrorWithProps("Dine-in capacity cannot be zero");
          }
          if (dineInCapacity < 0) {
            throw new ErrorWithProps(
              "Dine-in capacity must be a positive number"
            );
          }
        }
      }

      if (beverageCategory && beverageCategory?.length !== 0) {
        const beverageValidation = enumArrayValidation(
          BeverageCategory,
          beverageCategory
        );

        if (!beverageValidation?.success) {
          throw new ErrorWithProps(beverageValidation?.error);
        }
      }

      if (foodType && foodType?.length !== 0) {
        const foodValidation = enumArrayValidation(FoodType, foodType);

        if (!foodValidation?.success) {
          throw new ErrorWithProps(foodValidation?.error);
        }
      }

      if (meatType) {
        const meatValidation = enumValidation(MeatType, meatType);
        if (!meatValidation) {
          throw new ErrorWithProps(
            "Please provide valid meat type and try again!"
          );
        }
      }

      if (type) {
        const typeValidation = enumValidation(RestaurantType, type);
        if (!typeValidation) {
          throw new ErrorWithProps(
            "Please provide valid restaurant type and try again!"
          );
        }
      }

      if (website) {
        if (typeof website !== "string") {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }

        const validWebsite = validateWebSiteURL(website);
        if (!validWebsite) {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }
      }

      if (brandingLogo) {
        if (typeof brandingLogo !== "string") {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }

        const validWebsite = validateWebSiteURL(brandingLogo);
        if (!validWebsite) {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }
      }

      if (timezone) {
        if (typeof timezone.timezoneName !== "string") {
          throw new ErrorWithProps("Please provide a valid timezone!");
        }
      }

      // TODO: Add social info validations

      // Finally update / create the restaurant model
      const restoId = id || new mongoose.Types.ObjectId();
      await RestaurantModel.updateOne(
        { _id: restoId },
        {
          $set: {
            user: ctx.user,
            ...input,
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      // Set restaurant id in cookie
      setServerCookie(
        CookieKeys.RESTAURANT_ID_ONBOARDING,
        restoId.toString(),
        ctx
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  async restaurantOnboardingData(ctx: Context) {
    try {
      // Get restaurant id from cookie if present
      const id = getServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, ctx);

      if (!id) {
        return null;
      }

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        $or: [
          { status: UserStatus.internalVerificationPending },
          { status: UserStatus.restaurantOnboardingPending },
          { status: UserStatus.active },
        ],
      })
        .select("_id restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.AddRestaurant
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if restaurant details exists or not
      const restaurant = await RestaurantModel.findOne({
        _id: id,
        user: ctx.user,
        status: RestaurantStatus.onboardingPending,
      }).lean();

      // If restaurant details not found return null instead of throwing error because for the first time client will be expecting null only
      if (!restaurant) {
        return null;
      }

      return restaurant;
    } catch (error) {
      throw error;
    }
  }

  async completeRestaurantOnboarding(ctx: Context) {
    try {
      // Get restaurant id from cookie if present
      const id = getServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, ctx);

      if (!id) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        $or: [
          { status: UserStatus.internalVerificationPending },
          { status: UserStatus.restaurantOnboardingPending },
          { status: UserStatus.active },
        ],
      })
        .select("firstName lastName email phone status")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.AddRestaurant
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if restaurant details exists or not
      const restaurant = await RestaurantModel.findOne({
        _id: id,
        user: ctx.user,
        status: RestaurantStatus.onboardingPending,
        name: { $ne: null },
        address: { $ne: null },
        availability: { $ne: null, $size: 7 },
        category: { $ne: null },
        type: { $ne: null },
        website: { $ne: null },
        timezone: { $ne: null },
      }).lean();

      if (!restaurant) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const {
        name,
        address,
        availability,
        category,
        beverageCategory,
        meatType,
        foodType,
        type,
        website,
        dineInCapacity,
        brandingLogo,
        socialInfo,
        timezone,
      } = restaurant;

      // Validate all the input values
      if (name) {
        // TODO: Think if we want to keep restaurant name unique in user account or on global level
        const sameRestoName = await RestaurantModel.countDocuments({
          name: name,
          status: RestaurantStatus.active,
        });

        if (sameRestoName > 0) {
          throw new ErrorWithProps(
            "Restaurant name is already taken, please choose a different name"
          );
        }
      }

      if (address && Object.keys(address).length !== 0) {
        const addressIsValid = validateUSAddress(address);
        if (!addressIsValid) {
          throw new ErrorWithProps(
            "Please provide valid address details and try again!"
          );
        }
      }

      if (availability && availability.length !== 0) {
        const availabilityCheck = availabilityValidation(availability);

        if (!availabilityCheck.success) {
          throw new ErrorWithProps(availabilityCheck.error);
        }
      }

      if (category && category?.length !== 0) {
        const categoryValidation = enumArrayValidation(
          RestaurantCategory,
          category
        );

        if (!categoryValidation?.success) {
          throw new ErrorWithProps(categoryValidation?.error);
        }

        if (
          category.includes(RestaurantCategory.DineIn) ||
          category.includes(RestaurantCategory.PremiumDineIn)
        ) {
          if (!dineInCapacity) {
            throw new ErrorWithProps(
              "Dine-in capacity must be present for dine-in restaurants"
            );
          }
          if (dineInCapacity === 0 || !dineInCapacity) {
            throw new ErrorWithProps("Dine-in capacity cannot be zero");
          }
          if (dineInCapacity < 0) {
            throw new ErrorWithProps(
              "Dine-in capacity must be a positive number"
            );
          }
        }
      }

      if (beverageCategory && beverageCategory?.length !== 0) {
        const beverageValidation = enumArrayValidation(
          BeverageCategory,
          beverageCategory
        );

        if (!beverageValidation?.success) {
          throw new ErrorWithProps(beverageValidation?.error);
        }
      }

      if (foodType && foodType?.length !== 0) {
        const foodValidation = enumArrayValidation(FoodType, foodType);

        if (!foodValidation?.success) {
          throw new ErrorWithProps(foodValidation?.error);
        }
      }

      if (meatType) {
        const meatValidation = enumValidation(MeatType, meatType);
        if (!meatValidation) {
          throw new ErrorWithProps(
            "Please provide valid meat type and try again!"
          );
        }
      }

      if (type) {
        const typeValidation = enumValidation(RestaurantType, type);
        if (!typeValidation) {
          throw new ErrorWithProps(
            "Please provide valid restaurant type and try again!"
          );
        }
      }

      if (website) {
        if (typeof website !== "string") {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }

        const validWebsite = validateWebSiteURL(website);
        if (!validWebsite) {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }
      }

      if (brandingLogo) {
        if (typeof brandingLogo !== "string") {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }

        const validWebsite = validateWebSiteURL(brandingLogo);
        if (!validWebsite) {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }
      }

      if (timezone) {
        if (typeof timezone.timezoneName !== "string") {
          throw new ErrorWithProps("Please provide a valid timezone!");
        }
      }

      // Check if user is already verified or not
      let finalStatus = UserStatus.active;
      if (user.status === UserStatus.internalVerificationPending) {
        finalStatus = UserStatus.internalVerificationPending;
      }

      // Check if this is a new restaurant onboarding
      if (user.status === UserStatus.active) {
        await UserModel.updateOne(
          {
            _id: ctx?.user,
            status: UserStatus.active,
          },
          {
            $addToSet: {
              restaurants: {
                _id: id,
                id: id,
                name: name,
                status: RestaurantStatus.active,
                city: address.city,
              },
            },
          }
        );
      } else if (
        [
          UserStatus.internalVerificationPending,
          UserStatus.restaurantOnboardingPending,
        ].includes(user?.status)
      ) {
        await UserModel.updateOne(
          {
            _id: ctx?.user,
            status: {
              $in: [
                UserStatus.internalVerificationPending,
                UserStatus.restaurantOnboardingPending,
              ],
            },
          },
          {
            $set: {
              status: finalStatus,
            },
            $addToSet: {
              restaurants: {
                _id: id,
                id: id,
                name: name,
                status: RestaurantStatus.active,
                city: address.city,
              },
            },
          }
        );

        // Update user status in business model
        await BusinessModel.updateOne(
          { "user._id": ctx.user },
          { $set: { "user.status": finalStatus } }
        );
      }

      // Finally update the status in restaurant model
      await RestaurantModel.updateOne(
        { _id: id, user: ctx.user },
        { $set: { status: RestaurantStatus.active } }
      );

      // Set cookies
      clearServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, ctx);
      setServerCookie(CookieKeys.RESTAURANT_ID, id, ctx);

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async restaurantDetails(ctx: Context) {
    try {
      // Check input values
      if (!isAlphanumeric(ctx.user) || !isAlphanumeric(ctx.restaurantId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        status: UserStatus.active,
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Fetch team details from teams model by checking with ownerUserId
      let allUsersFromTeam: string[] = [];
      const team = await TeamsModel.findOne({
        _id: ctx.accountOwner,
      })
        .select("subUsers")
        .lean();

      if (team) {
        allUsersFromTeam = team.subUsers.map((e) => e._id.toString());
      }

      // Check if logged in user is in the team or is the owner
      if (
        ctx.accountOwner !== ctx.user &&
        !arraysHaveCommonElement(allUsersFromTeam, [ctx.user])
      ) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action!"
        );
      }

      // Check if restaurant details exists or not
      const restaurant = await RestaurantModel.findOne({
        _id: ctx.restaurantId,
        user: {
          $in: [ctx.accountOwner, ...allUsersFromTeam],
        },
        status: RestaurantStatus.active,
        name: { $ne: null },
        address: { $ne: null },
        availability: { $ne: null, $size: 7 },
        category: { $ne: null },
        type: { $ne: null },
        website: { $ne: null },
        timezone: { $ne: null },
      }).lean();

      if (!restaurant) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      return restaurant;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async setRestaurantIdAsCookie(id: string, ctx: Context) {
    try {
      // Clear the cookies
      if (id === "") {
        clearServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, ctx);
        return true;
      }

      // Check id
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if account owner is loaded or not
      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Fetch team details from teams model by checking with ownerUserId
      let allUsersFromTeam: string[] = [];
      const team = await TeamsModel.findOne({
        _id: ctx.accountOwner,
      })
        .select("subUsers")
        .lean();

      if (team) {
        allUsersFromTeam = team.subUsers.map((e) => e._id.toString());
      }

      // Check if logged in user is in the team or is the owner
      if (
        ctx.accountOwner !== ctx.user &&
        !arraysHaveCommonElement(allUsersFromTeam, [ctx.user])
      ) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action!"
        );
      }

      // Check if restaurant exists or not
      const restaurant = await RestaurantModel.findOne({
        _id: id,
        user: {
          $in: [ctx.accountOwner, ...allUsersFromTeam],
        },
      })
        .select("status")
        .lean();

      if (!restaurant) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action!"
        );
      }

      const user = await UserModel.findOne({
        _id: ctx.user,
        status: UserStatus.active,
      })
        .select("_id restaurants")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if logged in user has access to the given restaurant id
      if (restaurant.status === RestaurantStatus.active) {
        let hasRestoAccess = false;
        for (let index = 0; index < user.restaurants.length; index++) {
          const element = user.restaurants[index];
          if (element.id === id) {
            hasRestoAccess = true;
          }
        }

        if (!hasRestoAccess) {
          throw new ErrorWithProps(
            "You are not authorised to perform this action!"
          );
        }
      }

      if (restaurant.status === RestaurantStatus.onboardingPending) {
        setServerCookie(CookieKeys.RESTAURANT_ID_ONBOARDING, id, ctx);
      } else if (restaurant.status === RestaurantStatus.active) {
        setServerCookie(CookieKeys.RESTAURANT_ID, id, ctx);
      }

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateRestaurantDetails(input: RestaurantDetailsInput, ctx: Context) {
    try {
      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UpdateRestaurant
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

      const _id = ctx.restaurantId;

      // Get input and validate restaurant
      const {
        name,
        address,
        availability,
        category,
        beverageCategory,
        meatType,
        foodType,
        type,
        website,
        dineInCapacity,
        brandingLogo,
        socialInfo,
        timezone,
      } = input;

      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const restoCheck = await RestaurantModel.countDocuments({
        _id: _id,
        status: RestaurantStatus.active,
      }).lean();
      if (restoCheck !== 1) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      let mainUpdQuery: UpdateQuery<Restaurant> = {
        updatedBy: ctx.user,
      };
      let userUpdQuery: UpdateQuery<User> = {};
      let teamUpdQuery: UpdateQuery<Teams> = {};

      if (name) {
        // TODO: Think if we want to keep restaurant name unique in user account or on global level
        const sameRestoName = await RestaurantModel.countDocuments({
          name: name,
          status: RestaurantStatus.active,
        });

        if (sameRestoName > 0) {
          throw new ErrorWithProps(
            "Restaurant name is already taken, please choose a different name"
          );
        }

        mainUpdQuery.name = name;
        userUpdQuery = {
          ...userUpdQuery,
          "restaurants.$.name": name,
        };
        teamUpdQuery = {
          ...teamUpdQuery,
          "subUsers.$[].restaurants.$[resto].name": name,
        };
      }

      if (address && Object.keys(address).length !== 0) {
        const addressIsValid = validateUSAddress(address);
        if (!addressIsValid) {
          throw new ErrorWithProps(
            "Please provide valid address details and try again!"
          );
        }

        mainUpdQuery.address = address;
        userUpdQuery = {
          ...userUpdQuery,
          "restaurants.$.city": address.city,
        };
        teamUpdQuery = {
          ...teamUpdQuery,
          "subUsers.$[].restaurants.$[resto].city": address.city,
        };
      }

      if (availability && availability.length !== 0) {
        const availabilityCheck = availabilityValidation(availability);

        if (!availabilityCheck.success) {
          throw new ErrorWithProps(availabilityCheck.error);
        }

        mainUpdQuery.availability = availability;
      }

      if (category && category?.length !== 0) {
        const categoryValidation = enumArrayValidation(
          RestaurantCategory,
          category
        );

        if (!categoryValidation?.success) {
          throw new ErrorWithProps(categoryValidation?.error);
        }

        mainUpdQuery.category = category;

        if (
          category.includes(RestaurantCategory.DineIn) ||
          category.includes(RestaurantCategory.PremiumDineIn)
        ) {
          if (!dineInCapacity) {
            throw new ErrorWithProps(
              "Dine-in capacity must be present for dine-in restaurants"
            );
          }
          if (dineInCapacity === 0 || !dineInCapacity) {
            throw new ErrorWithProps("Dine-in capacity cannot be zero");
          }
          if (dineInCapacity < 0) {
            throw new ErrorWithProps(
              "Dine-in capacity must be a positive number"
            );
          }

          mainUpdQuery.dineInCapacity = dineInCapacity;
        }
      }

      if (beverageCategory && beverageCategory?.length !== 0) {
        const beverageValidation = enumArrayValidation(
          BeverageCategory,
          beverageCategory
        );

        if (!beverageValidation?.success) {
          throw new ErrorWithProps(beverageValidation?.error);
        }

        mainUpdQuery.beverageCategory = beverageCategory;
      }

      if (foodType && foodType?.length !== 0) {
        const foodValidation = enumArrayValidation(FoodType, foodType);

        if (!foodValidation?.success) {
          throw new ErrorWithProps(foodValidation?.error);
        }

        mainUpdQuery.foodType = foodType;
      }

      if (meatType) {
        const meatValidation = enumValidation(MeatType, meatType);
        if (!meatValidation) {
          throw new ErrorWithProps(
            "Please provide valid meat type and try again!"
          );
        }

        mainUpdQuery.meatType = meatType;
      }

      if (type) {
        const typeValidation = enumValidation(RestaurantType, type);
        if (!typeValidation) {
          throw new ErrorWithProps(
            "Please provide valid restaurant type and try again!"
          );
        }

        mainUpdQuery.type = type;
      }

      if (website) {
        if (typeof website !== "string") {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }

        const validWebsite = validateWebSiteURL(website);
        if (!validWebsite) {
          throw new ErrorWithProps(
            "Please provide valid website and try again!"
          );
        }

        mainUpdQuery.website = website;
      }

      if (brandingLogo) {
        if (typeof brandingLogo !== "string") {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }

        const validUrl = validateWebSiteURL(brandingLogo);
        if (!validUrl) {
          throw new ErrorWithProps("Please provide a valid branding logo!");
        }

        // TODO: Implement deleting of old logo from cloudinary
        mainUpdQuery.brandingLogo = brandingLogo;
      }

      if (timezone) {
        if (typeof timezone.timezoneName !== "string") {
          throw new ErrorWithProps("Please provide a valid timezone!");
        }

        mainUpdQuery.timezone = timezone;
      }

      if (socialInfo) {
        mainUpdQuery.socialInfo = socialInfo;
      }

      // Finally Update the restaurant details in restaurant, team and user model
      const updResto = RestaurantModel.updateOne(
        {
          _id: _id,
          status: RestaurantStatus.active,
        },
        { $set: mainUpdQuery }
      );

      const updUser = UserModel.updateOne(
        {
          restaurants: {
            $elemMatch: { _id: _id, status: RestaurantStatus.active },
          },
        },
        { $set: userUpdQuery }
      );

      const updTeam = TeamsModel.updateOne(
        {
          _id: ctx.accountOwner,
          "subUsers.restaurants._id": _id,
          "subUsers.restaurants.status": RestaurantStatus.active,
        },
        { $set: teamUpdQuery },
        {
          arrayFilters: [
            { "resto._id": _id, "resto.status": RestaurantStatus.active },
          ],
        }
      );

      const [_, __, ___] = await Promise.all([updResto, updUser, updTeam]);

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default RestaurantService;
