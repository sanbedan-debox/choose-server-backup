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
import { TaxRateInput, UpdateTaxRateInput } from "../interfaces/taxRate.input";
import { TaxRate } from "../schema/taxRate.schema";
import TaxRateService from "../services/taxRate.service";

@Resolver()
export class TaxRateResolver {
  constructor(private taxRateService: TaxRateService) {
    this.taxRateService = new TaxRateService();
  }

  @Mutation(() => String)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async addTaxRate(
    @Arg("input") input: TaxRateInput,
    @Ctx() ctx: Context
  ): Promise<string> {
    const resp = await this.taxRateService.addTaxRate(input, ctx);
    return resp;
  }

  @Mutation(() => Boolean)
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async updateTaxRate(
    @Arg("input") input: UpdateTaxRateInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    const resp = await this.taxRateService.updateTaxRate(input, ctx);
    return resp;
  }

  @Query(() => TaxRate)
  @UseMiddleware([isAuthenticated, isUser, hasRestaurantAccess])
  async getTaxRate(@Ctx() ctx: Context): Promise<TaxRate> {
    const resp = await this.taxRateService.getTaxRate(ctx);
    return resp;
  }
}
