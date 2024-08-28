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
import { PaginatedFilter } from "../../../types/common.input";
import Context from "../../../types/context.type";
import {
  AddCategoryInput,
  UpdateBulkCategoryInput,
  UpdateCategoryInput,
} from "../interfaces/category.input";
import { Category } from "../schema/category.schema";
import { CategoryService } from "../services/category.service";

@Resolver()
export class CategoryResolver {
  constructor(private categoryService: CategoryService) {
    this.categoryService = new CategoryService();
  }

  // add menu
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addCategory(
    @Arg("input") input: AddCategoryInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.addCategory(input, ctx);
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async updateCategory(
    @Arg("input") input: UpdateCategoryInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.updateCategory(input, ctx);
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async bulkUpdateCategory(
    @Arg("input", () => [UpdateBulkCategoryInput])
    input: UpdateBulkCategoryInput[],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.bulkUpdateCategory(input, ctx);
    return response;
  }

  // get category
  @Query(() => Category)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getCategory(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<Category> {
    const response = await this.categoryService.getCategory(id, ctx);
    return response;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addItemsToCategory(
    @Arg("itemIds", () => [String]) itemIds: string[],
    @Arg("categoryId") categoryId: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.addItemsToCategory(
      itemIds,
      categoryId,
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
  async removeItemFromCategory(
    @Arg("categoryId") categoryId: string,
    @Arg("itemId") itemId: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.removeItemFromCategory(
      categoryId,
      itemId,
      ctx
    );
    return response;
  }

  // get categories
  @Query(() => [Category])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getCategories(
    @Arg("filter", { defaultValue: null, nullable: true })
    filter: PaginatedFilter,
    @Arg("page", { defaultValue: 0 }) page: number,
    @Ctx() ctx: Context
  ): Promise<Category[]> {
    const response = await this.categoryService.getCategories(ctx);
    return response;
  }

  // change category status
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async changeCategoryStatus(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.categoryService.changeCategoryStatus(id, ctx);
    return response;
  }
}
