import { mongoose } from "@typegoose/typegoose";
import { StatusEnum } from "../../../types/common.enum";
import {
  CategoryModel,
  ItemInfo,
} from "../../categories/schema/category.schema";
import { ItemModel, ModifierGroupInfo } from "../../items/schema/item.schema";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { MenuModel } from "../../menu/schema/menu.schema";
import { PriceTypeEnum } from "../../modifiers/interfaces/modifier.enum";
import {
  ModifierGroupModel,
  ModifierInfo,
  ModifierModel,
} from "../../modifiers/schema/modifier.schema";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import {
  CloverRowItem,
  CloverRowItemVisibility,
} from "../interface/clover.type";

export const saveCloverDataWorker = async (
  restaurantId: string,
  user: string,
  rowItems: CloverRowItem[]
) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const resto = await RestaurantModel.findOne({ _id: restaurantId })
      .select("_id availability")
      .lean();
    if (!resto) {
      throw new Error("Restaurant not found for the given id");
    }

    // Fetch unique menu types
    const menus = await MenuModel.find({ type: { $ne: null } })
      .select("type")
      .lean();
    const uniqueMenuTypes = new Set<MenuTypeEnum>();
    menus.forEach((menu) => uniqueMenuTypes.add(menu.type));

    // Loop through all the items and save accordingly
    for (let i = 0; i < rowItems.length; i++) {
      const item: CloverRowItem = rowItems[i];

      let itemId: string | null = null;
      const itemAdded = await ItemModel.findOne({
        name: item.name,
        restaurantId: restaurantId,
      })
        .session(dbSession)
        .select("_id modifierGroup")
        .lean();

      if (itemAdded) {
        // Update the item
        await ItemModel.updateOne(
          { _id: itemAdded._id },
          {
            $set: {
              status: item.status ? StatusEnum.active : StatusEnum.inactive,
              visibility: item.visibility,
              priceOptions: item.priceOptions,
              price: item.price,
              options: item.itemOptions,
              availability: resto.availability,
              updatedBy: user,
            },
          },
          { session: dbSession }
        );

        itemId = itemAdded._id;
      } else {
        // Create new item
        const newItem = await ItemModel.create(
          [
            {
              name: item.name,
              user: user,
              restaurantId: restaurantId,
              status: item.status ? StatusEnum.active : StatusEnum.inactive,
              price: item.price,
              priceOptions: item.priceOptions,
              visibility: item.visibility,
              options: item.itemOptions,
              availability: resto.availability,
            },
          ],
          { session: dbSession }
        );

        if (newItem.length > 0) {
          itemId = newItem[0]._id;
        }
      }

      // Loop Categories
      for (let j = 0; j < item.categories.length; j++) {
        const category = item.categories[j];

        let categoryId: string | null = null;
        const categoryAdded = await CategoryModel.findOne({
          name: category.name,
          restaurantId: restaurantId,
        })
          .session(dbSession)
          .select("_id items")
          .lean();

        const visibilityArr: CloverRowItemVisibility[] = [];

        uniqueMenuTypes.forEach((menuType) => {
          visibilityArr.push({
            menuType: menuType,
            status: category.status ? StatusEnum.active : StatusEnum.inactive,
          });
        });

        let itemInfoArr: ItemInfo[] = categoryAdded?.items ?? [];
        const itemInfoIdx = itemInfoArr.findIndex((e) => e.id === itemId);
        if (itemInfoIdx < 0) {
          itemInfoArr.push({
            _id: itemId,
            id: itemId,
            image: null,
            name: item.name,
            price: item.price,
            status: item.status ? StatusEnum.active : StatusEnum.inactive,
          });
        }

        if (categoryAdded) {
          // Update the category
          await CategoryModel.updateOne(
            { _id: categoryAdded._id },
            {
              $set: {
                status: category.status
                  ? StatusEnum.active
                  : StatusEnum.inactive,
                visibility: visibilityArr,
                availability: resto.availability,
                items: itemInfoArr,
                updatedBy: user,
              },
            },
            { session: dbSession }
          );

          categoryId = categoryAdded._id;
        } else {
          // Create new category
          const newCategory = await CategoryModel.create(
            [
              {
                name: category.name,
                user: user,
                restaurantId: restaurantId,
                status: category.status
                  ? StatusEnum.active
                  : StatusEnum.inactive,
                visibility: item.visibility,
                availability: resto.availability,
                items: itemInfoArr,
              },
            ],
            { session: dbSession }
          );

          if (newCategory.length > 0) {
            categoryId = newCategory[0]._id;
          }
        }

        // Add this category in item model
        await ItemModel.updateOne(
          { _id: itemId },
          {
            $addToSet: {
              category: categoryId,
            },
          },
          { session: dbSession }
        );
      }

      let modiGrpInfoArr: ModifierGroupInfo[] = itemAdded?.modifierGroup ?? [];

      // Loop Modifier Groups
      for (let k = 0; k < item.modifierGroups.length; k++) {
        const modifierGroup = item.modifierGroups[k];

        let modiGrpId: string | null = null;
        const modiGrpAdded = await ModifierGroupModel.findOne({
          name: modifierGroup.name,
          restaurantId: restaurantId,
        })
          .session(dbSession)
          .select("_id modifiers")
          .lean();

        if (modiGrpAdded) {
          // Update the modifier group
          await ModifierGroupModel.updateOne(
            { _id: modiGrpAdded._id },
            {
              $set: {
                minSelections: modifierGroup.minRequired,
                maxSelections: modifierGroup.maxRequired,
                updatedBy: user,
              },
              $addToSet: {
                item: itemId,
              },
            },
            { session: dbSession }
          );

          modiGrpId = modiGrpAdded._id;
        } else {
          // Create new modifier group
          const newModiGrp = await ModifierGroupModel.create(
            [
              {
                name: modifierGroup.name,
                user: user,
                restaurantId: restaurantId,
                item: [itemId],
                minSelections: modifierGroup.minRequired,
                maxSelections: modifierGroup.maxRequired,
                optional: false,
                multiSelect: false,
                pricingType: PriceTypeEnum.IndividualPrice,
                price: null,
              },
            ],
            { session: dbSession }
          );

          if (newModiGrp.length > 0) {
            modiGrpId = newModiGrp[0]._id;
          }
        }

        let modiInfoArr: ModifierInfo[] = modiGrpAdded?.modifiers ?? [];

        // Loop Modifiers
        for (let l = 0; l < modifierGroup.modifiers.length; l++) {
          const modifier = modifierGroup.modifiers[l];

          let modiId: string | null = null;
          const modiAdded = await ModifierModel.findOne({
            name: modifier.name,
            restaurantId: restaurantId,
          })
            .session(dbSession)
            .select("_id")
            .lean();

          if (modiAdded) {
            // Update the modifier
            await ModifierModel.updateOne(
              { _id: modiAdded._id },
              {
                $set: {
                  price: modifier.price,
                  updatedBy: user,
                },
                $addToSet: {
                  modifierGroup: modiGrpId,
                },
              },
              { session: dbSession }
            );

            modiId = modiAdded._id;
          } else {
            // Create new modifier
            const newModi = await ModifierModel.create(
              [
                {
                  name: modifier.name,
                  price: modifier.price,
                  user: user,
                  restaurantId: restaurantId,
                  isItem: false,
                  preSelect: false,
                  modifierGroup: [modiGrpId],
                },
              ],
              { session: dbSession }
            );

            if (newModi.length > 0) {
              modiId = newModi[0]._id;
            }
          }

          let modiInfoIdx = modiInfoArr.findIndex((e) => e.id === modiId);
          if (modiInfoIdx < 0) {
            modiInfoArr.push({
              _id: modiId,
              desc: null,
              id: modiId,
              isItem: false,
              name: modifier.name,
              preSelect: false,
              price: modifier.price,
            });
          }
        }

        // Add modifiers to modifier group
        await ModifierGroupModel.updateOne(
          { _id: modiGrpId },
          { $set: { modifiers: modiInfoArr } },
          { session: dbSession }
        );

        // Add this modifier group in item model
        let modiGrpIdx = modiGrpInfoArr.findIndex((e) => e.id === modiGrpId);
        if (modiGrpIdx < 0) {
          modiGrpInfoArr.push({
            _id: modiGrpId,
            id: modiGrpId,
            name: modifierGroup.name,
            pricingType: PriceTypeEnum.IndividualPrice,
          });
        }

        await ItemModel.updateOne(
          { _id: itemId },
          {
            $set: { modifierGroup: modiGrpInfoArr },
          },
          { session: dbSession }
        );
      }
    }

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    console.log("Clover Save Data Error", error);
  } finally {
    await dbSession.endSession();
  }
};
