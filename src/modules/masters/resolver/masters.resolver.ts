import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isAdmin, isUser } from "../../../middlewares/authorisation";
import Context from "../../../types/context.type";
import { UserRole } from "../../user/interfaces/user.enum";
import { ConfigTypeEnum } from "../interface/masters.enum";
import {
  AddConfigInput,
  AddCuisineInput,
  AddItemOptionInput,
  AddPermissionInput,
  AddStateInput,
  AddTimezoneInput,
  UpdateItemOptionInput,
} from "../interface/masters.input";
import { Config } from "../schema/configs.schema";
import { Cuisine } from "../schema/cuisines.schema";
import { ItemOption } from "../schema/item_options.schema";
import { Permission } from "../schema/permissions.schema";
import { State } from "../schema/states.schema";
import { Timezone } from "../schema/timezones.schema";
import { MastersService } from "../services/masters.service";

@Resolver()
export class MastersResolver {
  constructor(private service: MastersService) {
    this.service = new MastersService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addState(@Arg("input") input: AddStateInput, @Ctx() ctx: Context) {
    return this.service.addState(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updateStateStatus(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.service.updateStateStatus(id, ctx);
  }
  @Query(() => [State])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllStates() {
    return this.service.getAllStates();
  }
  @Query(() => [State])
  @UseMiddleware([isAuthenticated])
  getActiveStates() {
    return this.service.getActiveStates();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addCuisine(@Arg("input") input: AddCuisineInput, @Ctx() ctx: Context) {
    return this.service.addCuisine(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updateCuisineStatus(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.service.updateCuisineStatus(id, ctx);
  }
  @Query(() => [Cuisine])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllCuisines() {
    return this.service.getAllCuisines();
  }
  @Query(() => [Cuisine])
  @UseMiddleware([isAuthenticated, isUser])
  getActiveCuisines() {
    return this.service.getActiveCuisines();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addTimezone(@Arg("input") input: AddTimezoneInput, @Ctx() ctx: Context) {
    return this.service.addTimezone(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updateTimezoneStatus(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.service.updateTimezoneStatus(id, ctx);
  }
  @Query(() => [Timezone])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllTimezones() {
    return this.service.getAllTimezones();
  }
  @Query(() => [Timezone])
  @UseMiddleware([isAuthenticated])
  getActiveTimezones() {
    return this.service.getActiveTimezones();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addPermission(@Arg("input") input: AddPermissionInput, @Ctx() ctx: Context) {
    return this.service.addPermission(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updatePermissionPreselect(
    @Arg("id") id: string,
    @Arg("preselect", () => [UserRole]) preselect: UserRole[],
    @Ctx() ctx: Context
  ) {
    return this.service.updatePermissionPreselect(id, preselect, ctx);
  }
  @Query(() => [Permission])
  @UseMiddleware([isAuthenticated])
  getAllPermissions() {
    return this.service.getAllPermissions();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addConfig(@Arg("input") input: AddConfigInput, @Ctx() ctx: Context) {
    return this.service.addConfig(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updateConfig(
    @Arg("id") id: string,
    @Arg("value") value: number,
    @Ctx() ctx: Context
  ) {
    return this.service.updateConfig(id, value, ctx);
  }
  @Query(() => [Config])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllConfigs() {
    return this.service.getAllConfigs();
  }
  @Query(() => Config)
  @UseMiddleware()
  getConfig(@Arg("type", () => ConfigTypeEnum) type: ConfigTypeEnum) {
    return this.service.getConfig(type);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  addItemOption(@Arg("input") input: AddItemOptionInput, @Ctx() ctx: Context) {
    return this.service.addItemOption(input, ctx);
  }
  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  updateItemOption(
    @Arg("input") input: UpdateItemOptionInput,
    @Ctx() ctx: Context
  ) {
    return this.service.updateItemOption(input, ctx);
  }
  @Query(() => [ItemOption])
  @UseMiddleware([isAuthenticated])
  getAllItemOptions() {
    return this.service.getAllItemOptions();
  }
}
