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
  AddSubCategoryInput,
  UpdateBulkSubCategoryInput,
  UpdateSubCategoryInput,
} from "../interfaces/subCategories.input";
import { SubCategory } from "../schema/subCategories.schema";
import { SubCategoryService } from "../services/subCategories.service";

@Resolver()
export class SubCategoryResolver {
  constructor(private service: SubCategoryService) {
    this.service = new SubCategoryService();
  }

  // add subCategory
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addSubCategory(
    @Arg("input") input: AddSubCategoryInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.service.addSubCategory(input, ctx);
    return response;
  }

  // Update SubCategory
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async updateSubCategory(
    @Arg("input") input: UpdateSubCategoryInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.service.updateSubCategory(input, ctx);
    return response;
  }

  // Bulk Update SubCategory
  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async bulkUpdateSubCategory(
    @Arg("input", () => [UpdateBulkSubCategoryInput])
    input: UpdateBulkSubCategoryInput[],
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const response = await this.service.bulkUpdateSubCategory(input, ctx);
    return response;
  }

  // get sub category
  @Query(() => SubCategory)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getSubCategory(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<SubCategory> {
    const response = await this.service.getSubCategory(id, ctx);
    return response;
  }

  // get sub categories
  @Query(() => [SubCategory])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getSubCategories(
    @Arg("filter", { defaultValue: null, nullable: true })
    filter: PaginatedFilter,
    @Arg("page", { defaultValue: 0 }) page: number,
    @Ctx() ctx: Context
  ): Promise<SubCategory[]> {
    const response = await this.service.getSubCategories(filter, page, ctx);
    return response;
  }
}
