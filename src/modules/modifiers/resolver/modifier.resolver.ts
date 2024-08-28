import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import {
  AddModifierGroupInput,
  AddModifierInput,
  UpdateBulkModifierGroupInput,
  UpdateBulkModifierInput,
  UpdateModifierGroupInput,
  UpdateModifierInput,
} from "../interfaces/modifier.input";
import { Modifier, ModifierGroup } from "../schema/modifier.schema";
import { ModifierService } from "../services/modifier.service";

export class ModifierResolver {
  constructor(private modifierService: ModifierService) {
    this.modifierService = new ModifierService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  addModifier(@Arg("input") input: AddModifierInput, @Ctx() ctx: Context) {
    return this.modifierService.addModifier(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  updateModifier(
    @Arg("input") input: UpdateModifierInput,
    @Ctx() ctx: Context
  ) {
    return this.modifierService.updateModifier(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  bulkUpdateModifiers(
    @Arg("input", () => [UpdateBulkModifierInput])
    input: UpdateBulkModifierInput[],
    @Ctx() ctx: Context
  ) {
    return this.modifierService.bulkUpdateModifiers(input, ctx);
  }

  @Query(() => Modifier)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  getModifier(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.modifierService.getModifier(id, ctx);
  }

  @Query(() => [Modifier])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  getModifiers(@Ctx() ctx: Context) {
    return this.modifierService.getModifiers(ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  addModifierGroup(
    @Arg("input") input: AddModifierGroupInput,
    @Arg("modifiers", () => [String]) modifiers: [string],
    @Ctx() ctx: Context
  ) {
    return this.modifierService.addModifierGroup(input, modifiers, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  updateModifierGroup(
    @Arg("input") input: UpdateModifierGroupInput,
    @Ctx() ctx: Context
  ) {
    return this.modifierService.updateModifierGroup(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  bulkUpdateModifierGroups(
    @Arg("input", () => [UpdateBulkModifierGroupInput])
    input: UpdateBulkModifierGroupInput[],
    @Ctx() ctx: Context
  ) {
    return this.modifierService.bulkUpdateModifierGroups(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  addModifierToGroup(
    @Arg("modifierIds", () => [String]) modifierIds: [string],
    @Arg("modifierGroupId") modifierGroupId: string,
    @Ctx() ctx: Context
  ) {
    return this.modifierService.addModifierToGroup(
      modifierIds,
      modifierGroupId,
      ctx
    );
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  removeModifierFromGroup(
    @Arg("modifierId") modifierId: string,
    @Arg("modifierGroupId") modifierGroupId: string,
    @Ctx() ctx: Context
  ) {
    return this.modifierService.removeModifierFromGroup(
      modifierId,
      modifierGroupId,
      ctx
    );
  }

  @Query(() => ModifierGroup)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  getModifierGroup(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.modifierService.getModifierGroup(id, ctx);
  }

  @Query(() => [ModifierGroup])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  getModifierGroups(@Ctx() ctx: Context) {
    return this.modifierService.getModifierGroups(ctx);
  }
}
