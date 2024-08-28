import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isUser, isUserPending } from "../../../middlewares/authorisation";
import { loadAccountOwner, loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import {
  BusinessDetailsInput,
  UpdateBusinessDetailsInput,
} from "../interface/business.input";
import { Business } from "../schema/business.schema";
import { BusinessService } from "../service/business.service";

export class BusinessResolver {
  constructor(private business: BusinessService) {
    this.business = new BusinessService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUserPending])
  async businessOnboarding(
    @Arg("input") input: BusinessDetailsInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.business.businessOnboarding(input, ctx);
  }

  @Query(() => Business, { nullable: true })
  @UseMiddleware([isAuthenticated, isUserPending])
  async businessOnboardingDetails(
    @Ctx() ctx: Context
  ): Promise<Business> | null {
    return await this.business.businessOnboardingDetails(ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUserPending])
  async completeBusinessOnboarding(@Ctx() ctx: Context): Promise<boolean> {
    return await this.business.completeBusinessOnboarding(ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  updateBusinessDetails(
    @Arg("input") input: UpdateBusinessDetailsInput,
    @Ctx() ctx: Context
  ) {
    return this.business.updateBusinessDetails(input, ctx);
  }
}
