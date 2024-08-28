import { ErrorWithProps } from "mercurius";
import { FilterQuery, UpdateQuery } from "mongoose";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import { joiSchema } from "../../../utils/validations";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { MenuQueueType } from "../../menu/interfaces/menu.enum";
import { MenuQueue } from "../../menu/queue/menu.queue";
import {
  Restaurant,
  RestaurantModel,
} from "../../restaurant/schema/restaurant.schema";
import { TaxRateInput, UpdateTaxRateInput } from "../interfaces/taxRate.input";
import { TaxRate, TaxRateModel } from "../schema/taxRate.schema";

class TaxRateService {
  async addTaxRate(input: TaxRateInput, ctx: Context): Promise<string> {
    try {
      // Check if logged in user is allowed to add tax rate or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UpdateTax
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if tax rate is already added for given restaurant
      const checkTaxRate = await TaxRateModel.countDocuments({
        restaurantId: ctx.restaurantId,
      }).lean();
      if (checkTaxRate > 0) {
        throw new ErrorWithProps(
          "Tax rate is already added, please update if needed"
        );
      }

      // Check if tax rate is present in restaurant
      const checkRestaurantTaxRate = await RestaurantModel.countDocuments({
        _id: ctx.restaurantId,
        taxRates: { $size: 1 },
      });
      if (checkRestaurantTaxRate > 0) {
        throw new ErrorWithProps(
          "Tax rate is already added, please update if needed"
        );
      }

      // Check input values
      const { error } = joiSchema.validate({
        name: input.name,
        salesTax: input.salesTax,
      });
      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      // Finally add the tax rate in tax rate model and restaurant model
      const taxRate = await TaxRateModel.create({
        name: input.name,
        salesTax: input.salesTax,
        user: ctx.user,
        restaurantId: ctx.restaurantId,
      });

      await RestaurantModel.updateOne(
        {
          _id: ctx.restaurantId,
          taxRates: { $size: 0 },
        },
        {
          $addToSet: {
            taxRates: {
              _id: taxRate._id,
              name: input.name,
              salesTax: input.salesTax,
            },
          },
        }
      );

      await MenuQueue.add({
        type: MenuQueueType.TaxRateAdded,
        restaurantId: ctx.restaurantId,
        taxRateId: taxRate._id.toString(),
      });

      return taxRate._id.toString();
    } catch (error) {
      throw error;
    }
  }

  async updateTaxRate(
    input: UpdateTaxRateInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      // Check if logged in user is allowed to update tax rate or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UpdateTax
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const filterQueryTaxRate: FilterQuery<TaxRate> = {
        _id: input._id,
        restaurantId: ctx.restaurantId,
      };

      const filterQueryRestaurant: FilterQuery<Restaurant> = {
        _id: ctx.restaurantId,
        taxRates: { $size: 0 },
      };

      // Check if tax rate is already added or not for given restaurant
      const checkTaxRate = await TaxRateModel.countDocuments(
        filterQueryTaxRate
      ).lean();
      if (checkTaxRate <= 0) {
        throw new ErrorWithProps("Tax rate is not added, please add if needed");
      }

      // Check if tax rate is present or not in restaurant
      const checkRestaurantTaxRate = await RestaurantModel.countDocuments(
        filterQueryRestaurant
      ).lean();
      if (checkRestaurantTaxRate > 0) {
        throw new ErrorWithProps("Tax rate is not added, please add if needed");
      }

      // Check input values and create update query
      let updateQueryTaxRate: UpdateQuery<TaxRate> = {
        updatedBy: ctx.user,
      };

      let updateQueryRestaurant: UpdateQuery<Restaurant> = {};

      if (input.name) {
        const { error } = joiSchema.validate({
          name: input.name,
        });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        updateQueryTaxRate = {
          ...updateQueryTaxRate,
          name: input.name,
        };
        updateQueryRestaurant = {
          ...updateQueryRestaurant,
          "taxRates.$.name": input.name,
        };
      }
      if (input.salesTax) {
        const { error } = joiSchema.validate({
          salesTax: input.salesTax,
        });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        updateQueryTaxRate = {
          ...updateQueryTaxRate,
          salesTax: input.salesTax,
        };
        updateQueryRestaurant = {
          ...updateQueryRestaurant,
          "taxRates.$.salesTax": input.salesTax,
        };
      }

      // Finally update the tax rate in tax rate model and restaurant model
      await TaxRateModel.updateOne(filterQueryTaxRate, {
        $set: updateQueryTaxRate,
      });

      await RestaurantModel.updateOne(
        {
          ...filterQueryRestaurant,
          taxRates: { $size: 1, $elemMatch: { _id: input._id } },
        },
        {
          $set: updateQueryRestaurant,
        }
      );

      await MenuQueue.add({
        type: MenuQueueType.TaxRateUpdated,
        restaurantId: ctx.restaurantId,
        taxRateId: input._id.toString(),
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getTaxRate(ctx: Context): Promise<TaxRate> {
    try {
      const filterQueryTaxRate: FilterQuery<TaxRate> = {
        restaurantId: ctx.restaurantId,
      };

      // Check if tax rate is already added or not for given restaurant
      const taxRate = await TaxRateModel.findOne(filterQueryTaxRate).lean();
      if (!taxRate) {
        throw new ErrorWithProps("Tax rate is not added, please add if needed");
      }

      return taxRate;
    } catch (error) {
      throw error;
    }
  }
}

export default TaxRateService;
