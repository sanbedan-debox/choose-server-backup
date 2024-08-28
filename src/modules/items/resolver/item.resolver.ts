import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { ItemService } from "../services/item.service";

import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import {
  AddItemInput,
  UpdateBulkItemInput,
  UpdateItemInput,
} from "../interfaces/item.input";
import { Item } from "../schema/item.schema";

@Resolver()
export class ItemResolver {
  constructor(private itemService: ItemService) {
    this.itemService = new ItemService();
  }

  // add item
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addItem(
    @Arg("input") input: AddItemInput,
    @Arg("modifierGroups", () => [String]) modifierGroups: [string],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.addItem(input, modifierGroups, ctx);
    return res;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async updateItem(
    @Arg("input") input: UpdateItemInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.updateItem(input, ctx);
    return res;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async bulkUpdateItem(
    @Arg("input", () => [UpdateBulkItemInput]) input: UpdateBulkItemInput[],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.bulkUpdateItem(input, ctx);
    return res;
  }

  // get item
  @Query(() => Item)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getItem(@Arg("id") id: string, @Ctx() ctx: Context): Promise<Item> {
    const res = await this.itemService.getItem(id, ctx);
    return res;
  }

  // get items
  @Query(() => [Item])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getItems(@Ctx() ctx: Context): Promise<Item[]> {
    const res = await this.itemService.getItems(ctx);
    return res;
  }

  // change item status
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async changeItemStatus(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.changeItemStatus(id, ctx);
    return res;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addModifierGroupsToItem(
    @Arg("itemId") itemId: string,
    @Arg("modifierGroupIds", () => [String]) modifierGroupIds: [string],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.addModifierGroupsToItem(
      itemId,
      modifierGroupIds,
      ctx
    );
    return res;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async removeModifierGroupFromItem(
    @Arg("itemId") itemId: string,
    @Arg("modifierGroupId") modifierGroupId: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const res = await this.itemService.removeModifierGroupFromItem(
      itemId,
      modifierGroupId,
      ctx
    );
    return res;
  }
}
