import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { CloverConnectionInput } from "../interface/clover.input";
import CloverService from "../service/clover.service";

export class CloverResolver {
  constructor(private service: CloverService) {
    this.service = new CloverService();
  }

  // Validate Clover connection
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async validateCloverConnection(
    @Arg("input") input: CloverConnectionInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return await this.service.validateCloverConnection(input, context);
  }

  // Disconnect Clover connection
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async disconnectCloverConnection(@Ctx() context: Context): Promise<boolean> {
    return await this.service.disconnectCloverConnection(context);
  }

  // Pull Data From Clover
  @Query(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async pullCloverData() {}
}
