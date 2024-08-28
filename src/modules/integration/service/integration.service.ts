import { ErrorWithProps } from "mercurius";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import { isAlphanumeric } from "../../../utils/validations";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { Integration, IntegrationModel } from "../schema/integration.schema";

class IntegrationService {
  async getAllIntegrations(ctx: Context): Promise<Integration[]> {
    try {
      // Check permissions
      const hasAccess = userHasPermission(ctx.permissions, [
        PermissionTypeEnum.Integrations,
      ]);

      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      if (!isAlphanumeric(ctx.restaurantId)) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if restaurant exist
      const restoCheck = await RestaurantModel.countDocuments({
        _id: ctx.restaurantId,
      }).lean();
      if (restoCheck !== 1) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const integtations = await IntegrationModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return integtations;
    } catch (error) {
      throw error;
    }
  }
}

export default IntegrationService;
