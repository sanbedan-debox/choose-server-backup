import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadAccountOwner, loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { RestaurantDetailsInput } from "../interfaces/restaurant.input";
import { Restaurant } from "../schema/restaurant.schema";
import RestaurantService from "../services/restaurant.service";

@Resolver()
export class RestaurantResolver {
  constructor(private restaurant: RestaurantService) {
    this.restaurant = new RestaurantService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, loadPermissions])
  restaurantOnboarding(
    @Arg("input") input: RestaurantDetailsInput,
    @Ctx() ctx: Context
  ) {
    return this.restaurant.restaurantOnboarding(input, ctx);
  }

  @Query(() => Restaurant)
  @UseMiddleware([isAuthenticated, loadPermissions])
  restaurantOnboardingData(@Ctx() ctx: Context) {
    return this.restaurant.restaurantOnboardingData(ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, loadPermissions])
  completeRestaurantOnboarding(@Ctx() ctx: Context) {
    return this.restaurant.completeRestaurantOnboarding(ctx);
  }

  @Query(() => Restaurant)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
    loadAccountOwner,
  ])
  restaurantDetails(@Ctx() ctx: Context) {
    return this.restaurant.restaurantDetails(ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  setRestaurantIdAsCookie(@Arg("id") id: string, @Ctx() ctx: Context) {
    return this.restaurant.setRestaurantIdAsCookie(id, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
    loadAccountOwner,
  ])
  updateRestaurantDetails(
    @Arg("input") input: RestaurantDetailsInput,
    @Ctx() ctx: Context
  ) {
    return this.restaurant.updateRestaurantDetails(input, ctx);
  }
}
