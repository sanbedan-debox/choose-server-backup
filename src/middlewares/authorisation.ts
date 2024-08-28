import { ErrorWithProps } from "mercurius";
import { MiddlewareFn } from "type-graphql";
import { AdminStatus } from "../modules/admin/interface/admin.interface";
import { AdminModel } from "../modules/admin/schema/admin.schema";
import { RestaurantStatus } from "../modules/restaurant/interfaces/restaurant.enums";
import { RestaurantModel } from "../modules/restaurant/schema/restaurant.schema";
import { UserStatus } from "../modules/user/interfaces/user.enum";
import { UserModel } from "../modules/user/schema/user.schema";
import Context from "../types/context.type";

const unauthorisedErrMessage =
  "You are not authorised to access this resource, please try again!";

export const isAdmin: MiddlewareFn<Context> = async ({ context }, next) => {
  const admin = await AdminModel.findOne({
    _id: context.user,
    status: AdminStatus.active,
  })
    .select("_id")
    .lean();

  if (!admin) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  return await next();
};

export const isUser: MiddlewareFn<Context> = async ({ context }, next) => {
  const user = await UserModel.findOne({
    _id: context.user,
    status: UserStatus.active,
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  return await next();
};

export const isUserPending: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  const user = await UserModel.findOne({
    _id: context.user,
    status: {
      $in: [
        UserStatus.onboardingPending,
        UserStatus.internalVerificationPending,
      ],
    },
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  return await next();
};

export const isUserPendingPayment: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  const user = await UserModel.findOne({
    _id: context.user,
    status: UserStatus.paymentPending,
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  return await next();
};

export const hasRestaurantAccess: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  if (context.restaurantId === undefined || context.restaurantId === "") {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  const restaurant = await RestaurantModel.countDocuments({
    _id: context.restaurantId,
    status: {
      $nin: [RestaurantStatus.blocked, RestaurantStatus.blockedBySystem],
    },
  }).lean();

  if (restaurant !== 1) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  const user = await UserModel.findOne({
    _id: context.user,
    status: UserStatus.active,
    restaurants: { $elemMatch: { _id: context.restaurantId } },
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ErrorWithProps(unauthorisedErrMessage);
  }

  return await next();
};
