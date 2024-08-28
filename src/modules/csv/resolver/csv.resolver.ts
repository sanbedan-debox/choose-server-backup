import { Arg, Ctx, Query, Resolver, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { UploadCsvErrorInput, UploadCsvInput } from "../interface/csv.input";
import { CsvUploadError } from "../schema/csv.schema";
import { CSVService } from "../services/csv.service";

@Resolver()
export class CSVResolver {
  constructor(private service: CSVService) {
    this.service = new CSVService();
  }

  @Query(() => [String])
  @UseMiddleware([isAuthenticated, isUser, hasRestaurantAccess])
  async getCsvHeaders(): Promise<string[]> {
    return await this.service.getCsvHeaders();
  }

  @Query(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async uploadCsvData(
    @Arg("input") input: UploadCsvInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.service.uploadCsvData(input, ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async saveCsvError(
    @Arg("input") input: UploadCsvErrorInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.service.saveCsvError(input, ctx);
  }

  @Query(() => [CsvUploadError])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getCsvErrors(@Ctx() ctx: Context): Promise<CsvUploadError[]> {
    return await this.service.getCsvErrors(ctx);
  }

  @Query(() => CsvUploadError)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getCsvError(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<CsvUploadError> {
    return await this.service.getCsvError(id, ctx);
  }
}
