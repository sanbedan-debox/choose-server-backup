import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isAdmin } from "../../../middlewares/authorisation";
import { PaginatedFilter } from "../../../types/common.input";
import Context from "../../../types/context.type";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";
import {
  AddAdminInput,
  AdminRole,
  AdminStatus,
} from "../interface/admin.interface";
import { Admin } from "../schema/admin.schema";
import AdminService from "../service/admin.service";

@Resolver()
export class AdminResolver {
  constructor(private adminService: AdminService) {
    this.adminService = new AdminService();
  }

  @Query(() => Admin)
  @UseMiddleware([isAuthenticated, isAdmin])
  me(@Ctx() ctx: Context) {
    return this.adminService.me(ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addAdmin(@Arg("input") input: AddAdminInput, @Ctx() ctx: Context) {
    return this.adminService.addAdmin(input, ctx);
  }

  // @Mutation(() => Boolean)
  // @UseMiddleware([isAuthenticated, isAdmin])
  // deleteAdmin(@Arg("id") id: string, @Ctx() ctx: Context) {
  //   return this.adminService.deleteAdmin(ctx, id);
  // }

  @Query(() => [Admin])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAdmins(@Ctx() ctx: Context) {
    return this.adminService.getAdmins(ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  revokeAdminAccess(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.adminService.revokeAdminAccess(id, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  changeRole(
    @Arg("id") id: string,
    @Arg("role", () => AdminRole) role: AdminRole,
    @Ctx() ctx: Context
  ) {
    return this.adminService.changeRole(ctx, id, role);
  }

  @Query(() => String)
  adminLogin(@Arg("email") email: string, @Ctx() context: Context) {
    return this.adminService.loginAdmin(email, context);
  }
  @Query(() => String)
  verifyAdminLogin(
    @Arg("email") email: string,
    @Arg("otp") otp: string,
    @Arg("otpId") otpId: string,
    @Ctx() context: Context
  ) {
    return this.adminService.verifyAdminLogin(email, otp, otpId, context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  adminLogout(@Ctx() context: Context) {
    return this.adminService.logoutAdmin(context);
  }

  @Query(() => [User])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllRestaurantUsers(
    @Arg("filter", { defaultValue: null, nullable: true })
    filter: PaginatedFilter,
    @Arg("page", { defaultValue: 0 }) page: number
  ) {
    return this.adminService.getAllRestaurantUsers(filter, page);
  }

  @Query(() => [Restaurant])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllRestaurants(
    @Arg("filter", { defaultValue: null, nullable: true })
    filter: PaginatedFilter,
    @Arg("page", { defaultValue: 0 }) page: number
  ) {
    return this.adminService.getAllRestaurants(filter, page);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  blockAdmin(
    @Arg("id") id: string,
    @Arg("updateStatus", () => AdminStatus) updateStatus: AdminStatus,
    @Ctx() ctx: Context
  ) {
    return this.adminService.blockAdmin(id, updateStatus, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  changeUserStatus(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.adminService.changeUserStatus(id, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  adminUserDetailsVerification(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.adminService.verifyUserDetails(id, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  adminUserDetailsRejection(
    @Arg("id") id: string,
    @Arg("content") content: string,
    @Ctx() ctx: Context
  ) {
    return this.adminService.rejectUserDetails(id, content, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  changeRestaurantStatus(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.adminService.changeRestaurantStatusAdmin(id, ctx);
  }

  // Danger Queries
  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  deleteData() {
    return this.adminService.deleteData();
  }
  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  deleteMenuData() {
    return this.adminService.deleteMenuData();
  }
}
