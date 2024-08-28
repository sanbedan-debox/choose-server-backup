import { Arg, Ctx, Query, Resolver, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isAdmin, isUser } from "../../../middlewares/authorisation";
import { loadAccountOwner, loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { Business } from "../../business/schema/business.schema";
import {
  RejectUserDetailsInput,
  UpdateUserInput,
  UserLoginVerificationInput,
  UserSignupInput,
  UserSignupVerificationInput,
  UserStatusChangeInput,
} from "../interfaces/user.input";
import { RestaurantInfo } from "../interfaces/user.objects";
import { User } from "../schema/user.schema";
import UserService from "../services/user.service";

@Resolver()
export class UserResolver {
  constructor(private user: UserService) {
    this.user = new UserService();
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware([isAuthenticated])
  async meUser(@Ctx() ctx: Context): Promise<User> {
    return await this.user.meUser(ctx);
  }

  @Query(() => String)
  async userSignup(@Arg("input") input: UserSignupInput): Promise<string> {
    return await this.user.userSignup(input);
  }

  @Query(() => Boolean)
  async userSignupVerification(
    @Ctx() context: Context,
    @Arg("input") input: UserSignupVerificationInput
  ): Promise<boolean> {
    return await this.user.userSignupVerification(input, context);
  }

  @Query(() => String)
  async userLogin(@Arg("input") input: string): Promise<string> {
    return await this.user.userLogin(input);
  }

  @Query(() => Boolean)
  async userLoginVerification(
    @Ctx() context: Context,
    @Arg("input") input: UserLoginVerificationInput
  ): Promise<boolean> {
    return await this.user.userLoginVerification(input, context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated])
  async userLogout(@Ctx() context: Context): Promise<boolean> {
    return await this.user.userLogout(context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser])
  async userLogoutFromEverywhere(@Ctx() context: Context): Promise<boolean> {
    return await this.user.userLogoutFromEverywhere(context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  async verifyUserDetails(
    @Arg("id") id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    return await this.user.verifyUserDetails(id, context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  async rejectUserDetails(
    @Arg("input") input: RejectUserDetailsInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return await this.user.rejectUserDetails(input, context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  async changeUserStatus(
    @Arg("input") input: UserStatusChangeInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return await this.user.changeUserStatus(input, context);
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async getUser(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<User> | null {
    return await this.user.getUser(id, ctx);
  }

  @Query(() => Business)
  @UseMiddleware([isAuthenticated])
  async userBusinessDetails(@Ctx() context: Context): Promise<Business> {
    return await this.user.userBusinessDetails(context);
  }

  @Query(() => [RestaurantInfo])
  @UseMiddleware([isAuthenticated, isUser])
  async userRestaurants(@Ctx() context: Context): Promise<RestaurantInfo[]> {
    return await this.user.userRestaurants(context);
  }

  @Query(() => [RestaurantInfo])
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async userRestaurantsPending(
    @Ctx() context: Context
  ): Promise<RestaurantInfo[]> {
    return await this.user.userRestaurantsPending(context);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  updateUserDetails(@Arg("input") input: UpdateUserInput, @Ctx() ctx: Context) {
    return this.user.updateUserDetails(input, ctx);
  }

  @Query(() => String)
  @UseMiddleware([isAuthenticated, isUser])
  enable2FA(@Ctx() ctx: Context) {
    return this.user.enable2FA(ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser])
  verify2FASetup(@Arg("authCode") authCode: string, @Ctx() ctx: Context) {
    return this.user.verify2FASetup(authCode, ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser])
  disable2FA(@Arg("authCode") authCode: string, @Ctx() ctx: Context) {
    return this.user.disable2FA(authCode, ctx);
  }
}
