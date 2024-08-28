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
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import {
  AddMenuInput,
  UpdateBulkMenuInput,
  UpdateMenuInput,
} from "../interfaces/menu.input";
import { Menu } from "../schema/menu.schema";
import MenuService from "../services/menu.service";

@Resolver()
export class MenuResolver {
  constructor(private menuService: MenuService) {
    this.menuService = new MenuService();
  }

  // add menu
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addMenu(
    @Arg("input") input: AddMenuInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.addMenu(input, ctx);
    return response;
  }

  // update menu
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async updateMenu(
    @Arg("input") input: UpdateMenuInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.updateMenu(input, ctx);
    return response;
  }

  // bulk update menu
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async bulkUpdateMenu(
    @Arg("input", () => [UpdateBulkMenuInput]) input: UpdateBulkMenuInput[],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.bulkUpdateMenu(input, ctx);
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addCategoriesToMenu(
    @Arg("categoryIds", () => [String]) categoryIds: string[],
    @Arg("menuId") menuId: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.addCategoriesToMenu(
      categoryIds,
      menuId,
      ctx
    );
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async removeCategoryFromMenu(
    @Arg("menuId") menuId: string,
    @Arg("categoryId") categoryId: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.removeCategoryFromMenu(
      menuId,
      categoryId,
      ctx
    );
    return response;
  }

  @Query(() => [Menu])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getAllMenus(@Ctx() ctx: Context): Promise<Menu[]> {
    const response = await this.menuService.getAllMenus(ctx);
    return response;
  }

  @Query(() => Menu)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getMenu(
    @Ctx() ctx: Context,
    @Arg("id", { nullable: false }) id?: string
  ): Promise<Menu> {
    const response = await this.menuService.getMenu(ctx, id);
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async changeMenuStatus(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.menuService.changeMenuStatus(id, ctx);
    return response;
  }
}
