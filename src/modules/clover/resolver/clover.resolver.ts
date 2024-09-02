import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { CloverConnectionInput } from "../interface/clover.input";
import { CloverInventory, CloverRowItem } from "../interface/clover.type";
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
  @Query(() => CloverInventory)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async fetchCloverInventory(
    @Ctx() context: Context
  ): Promise<CloverInventory> {
    return await this.service.fetchCloverInventory(context);
  }

  // Is Clover Connected
  @Query(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async isCloverConnected(@Ctx() context: Context): Promise<boolean> {
    return await this.service.isCloverConnected(context);
  }

  // Save Clover Menu
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async saveCloverData(
    @Arg("rowItems", () => [CloverRowItem]) rowItems: CloverRowItem[],
    @Ctx() context: Context
  ): Promise<boolean> {
    return await this.service.saveCloverData(rowItems, context);
  }
}
