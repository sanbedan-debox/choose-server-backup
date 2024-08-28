import { MiddlewareFn } from "type-graphql";
import { AdminRole } from "../modules/admin/interface/admin.interface";
import { TeamsModel } from "../modules/teams/schema/teams.schema";
import { UserRole } from "../modules/user/interfaces/user.enum";
import { UserModel } from "../modules/user/schema/user.schema";
import Context from "../types/context.type";

export const isUserRole = (role: UserRole | AdminRole | undefined): boolean => {
  try {
    return Object.values(UserRole).includes(role as UserRole);
  } catch (error) {
    return false;
  }
};

export const isAdminRole = (
  role: UserRole | AdminRole | undefined
): boolean => {
  try {
    return Object.values(AdminRole).includes(role as AdminRole);
  } catch (error) {
    return false;
  }
};

export const loadPermissions: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  if (isUserRole(context.role)) {
    const user = await UserModel.findOne({
      _id: context.user,
      permissions: { $exists: true, $type: "array", $ne: [] },
    })
      .select("permissions")
      .lean();

    context.permissions = user.permissions;
  }

  return await next();
};

export const loadAccountOwner: MiddlewareFn<Context> = async (
  { context },
  next
) => {
  if (isUserRole(context.role)) {
    const team = await TeamsModel.findOne({
      subUsers: { $elemMatch: { _id: context.user } },
    })
      .select("_id")
      .lean();

    if (team?._id) {
      context.accountOwner = team._id.toString();
    } else {
      // Check if logged in user is only the account owner or not
      const checkTeam = await TeamsModel.findOne({ _id: context.user })
        .select("_id")
        .lean();

      if (checkTeam) {
        context.accountOwner = context.user;
      } else {
        // Team is not present now
        context.accountOwner = context.user;
      }
    }
  }

  return await next();
};
