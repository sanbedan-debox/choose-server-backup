import { UpdateQuery } from "mongoose";
import { StatusEnum } from "../../../types/common.enum";
import { CategoryModel } from "../../categories/schema/category.schema";
import { Item, ItemModel } from "../../items/schema/item.schema";
import { TaxRateModel } from "../../taxRate/schema/taxRate.schema";
import { MenuTypeEnum } from "../interfaces/menu.enum";
import { MenuModel } from "../schema/menu.schema";

export const newMenuAddedWorker = async (
  menuType: MenuTypeEnum,
  menuId: string,
  restaurantId: string
) => {
  // Check if the newly added menu type is already added or it's the first one
  const checkMenuType = await MenuModel.countDocuments({
    restaurantId: restaurantId,
    type: menuType,
    _id: { $ne: menuId },
  });

  if (checkMenuType === 0) {
    // Add this menuType to all categories and items visibility array and items priceOptions array for the give restaurant id
    // Categories
    const allCategories = await CategoryModel.find({
      restaurantId: restaurantId,
    })
      .select("_id visibility")
      .lean();
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      if (!category.visibility.map((e) => e.menuType).includes(menuType)) {
        await CategoryModel.updateOne(
          { _id: category._id },
          {
            $addToSet: {
              visibility: { menuType: menuType, status: StatusEnum.inactive },
            },
          }
        );
      }
    }

    // Items
    const allItems = await ItemModel.find({
      restaurantId: restaurantId,
    })
      .select("_id price visibility priceOptions")
      .lean();
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      let updateQuery: UpdateQuery<Item> = {};

      if (!item.visibility.map((e) => e.menuType).includes(menuType)) {
        updateQuery = {
          ...updateQuery,
          $addToSet: {
            visibility: { menuType: menuType, status: StatusEnum.inactive },
          },
        };
      }

      if (!item.priceOptions.map((e) => e.menuType).includes(menuType)) {
        updateQuery = {
          ...updateQuery,
          $addToSet: {
            priceOptions: { menuType: menuType, price: item.price },
          },
        };
      }

      if (Object.keys(updateQuery).length > 0) {
        await ItemModel.updateOne({ _id: item._id }, updateQuery);
      }
    }
  }
};

export const addUpdateMenuTaxRateWorker = async (
  restaurantId: string,
  taxRateId: string
) => {
  // Check if tax rate is already added or not for given restaurant
  const taxRate = await TaxRateModel.findOne({
    _id: taxRateId,
    restaurantId: restaurantId,
  })
    .select("_id name salesTax")
    .lean();

  if (taxRate) {
    // Add tax rate to all the menus where tax rate is not present
    await MenuModel.updateMany(
      {
        restaurantId: restaurantId,
        taxes: { $eq: null },
      },
      {
        $set: {
          taxes: {
            _id: taxRate._id,
            name: taxRate.name,
            salesTax: taxRate.salesTax,
          },
        },
      }
    );

    // Update tax rate to all the menus where tax rate is already present
    await MenuModel.updateMany(
      {
        restaurantId: restaurantId,
        taxes: { $ne: null },
      },
      {
        "taxes.name": taxRate.name,
        "taxes.salesTax": taxRate.salesTax,
      }
    );
  }
};
