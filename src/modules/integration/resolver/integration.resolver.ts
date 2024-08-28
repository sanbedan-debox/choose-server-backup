import { Ctx, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import {
  hasRestaurantAccess,
  isUser,
} from "../../../middlewares/authorisation";
import { loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import { Integration } from "../schema/integration.schema";
import IntegrationService from "../service/integration.service";

export class IntegrationResolver {
  constructor(private service: IntegrationService) {
    this.service = new IntegrationService();
  }

  // Get all integrations for restaurant
  @Query(() => [Integration])
  @UseMiddleware([
    isAuthenticated,
    isUser,
    hasRestaurantAccess,
    loadPermissions,
  ])
  async getAllIntegrations(@Ctx() context: Context): Promise<Integration[]> {
    return await this.service.getAllIntegrations(context);
  }
}
