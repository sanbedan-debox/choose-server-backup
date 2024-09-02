import { mongoose } from "@typegoose/typegoose";
import { ErrorWithProps } from "mercurius";
import { UpdateQuery } from "mongoose";
import { StatusEnum } from "../../../types/common.enum";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import {
  arraysHaveCommonElement,
  availabilityValidation,
  enumValidation,
  isAlphanumeric,
  joiSchema,
  validateWebSiteURL,
} from "../../../utils/validations";
import {
  Category,
  CategoryModel,
} from "../../categories/schema/category.schema";
import {
  ItemOptionsEnum,
  PermissionTypeEnum,
} from "../../masters/interface/masters.enum";
import { MastersService } from "../../masters/services/masters.service";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { MenuModel } from "../../menu/schema/menu.schema";
import { ModifierGroupModel } from "../../modifiers/schema/modifier.schema";
import { SubCategoryModel } from "../../subCategories/schema/subCategories.schema";
import {
  AddItemInput,
  UpdateBulkItemInput,
  UpdateItemInput,
} from "../interfaces/item.input";
import { Item, ItemModel, ModifierGroupInfo } from "../schema/item.schema";

export class ItemService {
  async addItem(input: AddItemInput, modifierGroups: string[], ctx: Context) {
    try {
      // Check if logged in User is allowed to add Menu or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const {
        availability,
        desc,
        image,
        name,
        options,
        orderLimit,
        price,
        priceOptions,
        status,
        subCategory,
        visibility,
      } = input;

      // Check input values
      const { error } = joiSchema.validate({ name });

      if (error) {
        throw new ErrorWithProps(error.message);
      }

      if (price < 0) {
        throw new ErrorWithProps(
          "Price should be greater than 0, please try again!"
        );
      }

      if (name.length > 60) {
        throw new ErrorWithProps(
          "Item name cannot be more than 60 characters, please try again!"
        );
      }

      if (desc !== null) {
        const { error } = joiSchema.validate({ desc });

        if (error) {
          throw new ErrorWithProps(error.message);
        }

        if (desc.length < 20 || desc.length > 160) {
          throw new ErrorWithProps(
            "Description must be more than 20 characters but less than 160 characters, please try again!"
          );
        }
      }

      if (image && !validateWebSiteURL(image)) {
        throw new ErrorWithProps("Please enter a valid image and try again");
      }

      const isValidStatus = enumValidation(StatusEnum, status);

      if (!isValidStatus) {
        throw new ErrorWithProps("Please select a valid status and try again!");
      }

      // Check if any item with same name is already added for given restaurant
      const checkSameName = await ItemModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: name,
      }).lean();

      if (checkSameName > 0) {
        throw new ErrorWithProps(
          `Item with ${input?.name} name already exist, please try again!`
        );
      }

      // Item options validation
      let isHalalPresent = false;
      let isVeganPresent = false;

      const masterServices = new MastersService();
      for (let i = 0; i < input.options.length; i++) {
        const option = input.options[i];
        const check = await masterServices.checkItemOptionExist(
          option._id,
          option.type
        );
        if (!check) {
          throw new ErrorWithProps(
            "Invalid option type given, please try again!"
          );
        }

        if (option.type === ItemOptionsEnum.IsHalal && option.status) {
          isHalalPresent = true;
        }
        if (option.type === ItemOptionsEnum.IsVegan && option.status) {
          isVeganPresent = true;
        }
      }

      if (isHalalPresent && isVeganPresent) {
        throw new ErrorWithProps(
          "Item cannot be halal and vegan at the same time, please check and try again!"
        );
      }

      const availabilityCheck = availabilityValidation(availability);

      if (!availabilityCheck.success) {
        throw new ErrorWithProps(availabilityCheck.error);
      }

      let modifierGroupWithIds: ModifierGroupInfo[] = [];

      if ((modifierGroups ?? []).length > 0) {
        // Check all id's
        for (let i = 0; i < modifierGroups.length; i++) {
          const elem = modifierGroups[i];
          if (!isAlphanumeric(elem)) {
            throw new ErrorWithProps("Something went wrong, please try again!");
          }
        }

        const modifierGroupsFound = await ModifierGroupModel.find({
          _id: { $in: modifierGroups },
          restaurantId: ctx.restaurantId,
        })
          .select("_id name pricingType")
          .lean();

        if (modifierGroupsFound?.length !== modifierGroups.length) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        modifierGroupWithIds = modifierGroupsFound?.map((el) => ({
          ...el,
          id: el?._id.toString(),
        }));
      }

      if ((visibility ?? []).length > 0) {
        let type = new Set();

        visibility.map((el) => {
          const isType = enumValidation(MenuTypeEnum, el.menuType);
          const isStatus = enumValidation(StatusEnum, el.status);

          if (!isType) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          if (!isStatus) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          type.add(el.menuType);
        });

        const uniqueMenuType = await MenuModel.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
            },
          },
          {
            $group: {
              _id: "$type",
            },
          },
        ]);

        if (uniqueMenuType.length !== visibility.length) {
          throw new ErrorWithProps("Please select a valid menu and try again");
        }
      }

      if ((priceOptions ?? []).length > 0) {
        let type = new Set();

        priceOptions.map((el) => {
          const isType = enumValidation(MenuTypeEnum, el.menuType);
          const isPriceValid = el.price >= 0;

          if (!isType) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          if (!isPriceValid) {
            throw new ErrorWithProps(`Please enter a valid price`);
          }

          type.add(el.menuType);
        });

        const uniqueMenuType = await MenuModel.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
            },
          },
          {
            $group: {
              _id: "$type",
            },
          },
        ]);

        if (uniqueMenuType.length !== visibility.length) {
          throw new ErrorWithProps("Please select a valid menu and try again");
        }
      }

      if (subCategory !== null) {
        const checkSubCate = await SubCategoryModel.countDocuments({
          name: subCategory.name,
        }).lean();

        if (checkSubCate <= 0) {
          throw new ErrorWithProps(
            `Sub Category with ${subCategory.name} name does not exist, please try again!`
          );
        }
      }

      // Finally create the item
      const item = await ItemModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        availability,
        visibility,
        modifierGroup: modifierGroupWithIds,
        name,
        desc,
        image,
        options,
        priceOptions,
        orderLimit,
        status,
        price,
      });

      // Also add item to the modifier group
      if (modifierGroupWithIds.length > 0) {
        await ModifierGroupModel.updateMany(
          {
            _id: { $in: modifierGroups },
            restaurantId: ctx.restaurantId,
          },
          {
            $addToSet: {
              item: item._id,
            },
          }
        );
      }

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateItem(input: UpdateItemInput, ctx: Context) {
    try {
      // Check if logged in User is allowed to add Menu or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const {
        _id,
        availability,
        desc,
        image,
        name,
        options,
        orderLimit,
        price,
        priceOptions,
        status,
        subCategory,
        visibility,
      } = input;

      // Sanity checks
      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const isItem = await ItemModel.countDocuments({
        _id: _id,
      }).lean();

      if (!isItem) {
        throw new ErrorWithProps("Item not found, please try again");
      }

      // Check input values and create update query
      let mainUpdQuery: UpdateQuery<Item> = {
        updatedBy: ctx.user,
      };
      let cateUpdQuery: UpdateQuery<Category> = {};

      if (name) {
        const { error } = joiSchema.validate({
          name: name,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (name.length > 60) {
          throw new ErrorWithProps(
            "Category name cannot be more than 60 characters, please try again!"
          );
        }

        // Check same name
        const sameName = await ItemModel.countDocuments({
          restaurantId: ctx.restaurantId,
          name: name,
          _id: { $ne: _id },
        });

        if (sameName > 0) {
          throw new ErrorWithProps(
            `Item with ${name} name already exists, please try a different name to continue`
          );
        }

        mainUpdQuery.name = name;
        cateUpdQuery = {
          ...cateUpdQuery,
          "items.$.name": name,
        };
      }

      if (desc) {
        const { error } = joiSchema.validate({
          desc: desc,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (desc.length < 20 || desc.length > 160) {
          throw new ErrorWithProps(
            "Description must be more than 20 characters but less than 160 characters, please try again!"
          );
        }

        mainUpdQuery.desc = desc;
      }

      if (price) {
        if (price < 0) {
          throw new ErrorWithProps(
            "Price should be greater than 0, please try again!"
          );
        }

        mainUpdQuery.price = price;
        cateUpdQuery = {
          ...cateUpdQuery,
          "items.$.price": price,
        };
      }

      if (availability) {
        const availabilityCheck = availabilityValidation(availability);

        if (!availabilityCheck.success) {
          throw new ErrorWithProps(availabilityCheck.error);
        }

        mainUpdQuery.availability = availability;
      }

      if ((visibility ?? []).length > 0) {
        let type = new Set();

        visibility.map((el) => {
          const isType = enumValidation(MenuTypeEnum, el.menuType);
          const isStatus = enumValidation(StatusEnum, el.status);

          console.log(el.menuType);

          if (!isType) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          if (!isStatus) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          type.add(el.menuType);
        });

        const uniqueMenuType = await MenuModel.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
            },
          },
          {
            $group: {
              _id: "$type",
            },
          },
        ]);

        if (uniqueMenuType.length !== visibility.length) {
          throw new ErrorWithProps("Please select a valid menu and try again");
        }

        mainUpdQuery.visibility = visibility;
      }

      if ((priceOptions ?? []).length > 0) {
        let type = new Set();

        priceOptions.map((el) => {
          const isType = enumValidation(MenuTypeEnum, el.menuType);
          const isPriceValid = el.price >= 0;

          if (!isType) {
            throw new ErrorWithProps(
              "Please select a valid menu and try again"
            );
          }

          if (!isPriceValid) {
            throw new ErrorWithProps(`Please enter a valid price`);
          }

          type.add(el.menuType);
        });

        const uniqueMenuType = await MenuModel.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(ctx.restaurantId),
            },
          },
          {
            $group: {
              _id: "$type",
            },
          },
        ]);

        if (uniqueMenuType.length !== priceOptions.length) {
          throw new ErrorWithProps("Please select a valid menu and try again");
        }

        mainUpdQuery.priceOptions = priceOptions;
      }

      if (subCategory) {
        const checkSubCate = await SubCategoryModel.countDocuments({
          name: subCategory.name,
        }).lean();

        if (checkSubCate <= 0) {
          throw new ErrorWithProps(
            `Sub Category with ${subCategory.name} name does not exist, please try again!`
          );
        }

        mainUpdQuery.subCategory = subCategory;
      }

      if (status) {
        const isValid = enumValidation(StatusEnum, status);

        if (!isValid) {
          throw new ErrorWithProps(
            "Please select a valid status and try again!"
          );
        }

        mainUpdQuery.status = status;
        cateUpdQuery = {
          ...cateUpdQuery,
          "items.$.status": status,
        };
      }

      if (image) {
        const isImageValid = validateWebSiteURL(image);
        if (!isImageValid) {
          throw new ErrorWithProps("Please enter a valid image and try again!");
        }

        mainUpdQuery.image = image;
        cateUpdQuery = {
          ...cateUpdQuery,
          "items.$.image": image,
        };
      }

      if (orderLimit !== null) {
        if (orderLimit <= 0) {
          throw new ErrorWithProps(
            "Please enter valid order limit and try again"
          );
        }

        mainUpdQuery.orderLimit = orderLimit;
      }

      // Item options validation
      let isHalalPresent = false;
      let isVeganPresent = false;

      const masterServices = new MastersService();
      options.forEach(async (option) => {
        const check = await masterServices.checkItemOptionExist(
          option._id,
          option.type
        );
        if (!check) {
          throw new ErrorWithProps(
            "Invalid option type give, please try again!"
          );
        }

        isHalalPresent = option.type === ItemOptionsEnum.IsHalal;
        isVeganPresent = option.type === ItemOptionsEnum.IsVegan;
      });

      if (isHalalPresent && isVeganPresent) {
        throw new ErrorWithProps(
          "Item cannot be halal and vegan at the same time, please check and try again!"
        );
      }

      mainUpdQuery.options = options;

      // Finally update the item in item model and category model
      await ItemModel.updateOne(
        {
          _id: _id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: mainUpdQuery,
        }
      );

      if (Object.keys(cateUpdQuery).length > 0) {
        await CategoryModel.updateOne(
          {
            restaurantId: ctx.restaurantId,
            items: { $elemMatch: { _id: _id } },
          },
          {
            $set: cateUpdQuery,
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateItem(inputs: UpdateBulkItemInput[], ctx: Context) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Check if logged in User is allowed to add Menu or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];

        const { _id, name, status } = input;

        // Sanity checks
        if (!isAlphanumeric(_id)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        const isItem = await ItemModel.countDocuments({
          _id: _id,
        }).lean();

        if (!isItem) {
          throw new ErrorWithProps("Item not found, please try again");
        }

        // Check input values and create update query
        let mainUpdQuery: UpdateQuery<Item> = {
          updatedBy: ctx.user,
        };
        let cateUpdQuery: UpdateQuery<Category> = {};

        if (name) {
          const { error } = joiSchema.validate({
            name: name,
          });

          if (error) {
            throw new ErrorWithProps(error.message.toString());
          }

          if (name.length > 60) {
            throw new ErrorWithProps(
              "Category name cannot be more than 60 characters, please try again!"
            );
          }

          // Check same name
          const sameName = await ItemModel.countDocuments({
            restaurantId: ctx.restaurantId,
            name: name,
            _id: { $ne: _id },
          });

          if (sameName > 0) {
            throw new ErrorWithProps(
              `Item with ${name} name already exists, please try a different name to continue`
            );
          }

          mainUpdQuery.name = name;
          cateUpdQuery = {
            ...cateUpdQuery,
            "items.$.name": name,
          };
        }

        if (status) {
          const isValid = enumValidation(StatusEnum, status);

          if (!isValid) {
            throw new ErrorWithProps(
              "Please select a valid status and try again!"
            );
          }

          mainUpdQuery.status = status;
          cateUpdQuery = {
            ...cateUpdQuery,
            "items.$.status": status,
          };
        }

        // Finally update the item in item model and category model
        await ItemModel.updateOne(
          {
            _id: _id,
            restaurantId: ctx.restaurantId,
          },
          {
            $set: mainUpdQuery,
          },
          { session: dbSession }
        );

        if (Object.keys(cateUpdQuery).length > 0) {
          await CategoryModel.updateOne(
            {
              restaurantId: ctx.restaurantId,
              items: { $elemMatch: { _id: _id } },
            },
            {
              $set: cateUpdQuery,
            },
            { session: dbSession }
          );
        }
      }

      await dbSession.commitTransaction();
      return true;
    } catch (error) {
      await dbSession.abortTransaction();
      throw new ErrorWithProps(error.message.toString());
    } finally {
      await dbSession.endSession();
    }
  }

  async getItem(id: string, ctx: Context) {
    try {
      // Check if logged in user has permission or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Sanity check
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again");
      }

      // Find the item
      const item = await ItemModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!item) {
        throw new ErrorWithProps("Invalid item provided, please try again");
      }

      return item;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getItems(ctx: Context) {
    try {
      // Check if logged in user has permission or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Fetch all the items for selected restaurant
      const items = await ItemModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return items;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async changeItemStatus(id: string, ctx: Context) {
    try {
      // Check if logged in user has permission or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Sanity check
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again");
      }

      // Find the item
      const item = await ItemModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      })
        .select("_id status category modifierGroup")
        .lean();

      if (!item) {
        throw new ErrorWithProps("Invalid item provided, please try again");
      }

      // Update the status for item
      let newStatus: StatusEnum = StatusEnum.active;

      if (item.status === StatusEnum.active) {
        newStatus = StatusEnum.inactive;
      }

      // Finally update the status in item and category
      const updItem = ItemModel.updateOne(
        {
          _id: id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: {
            updatedBy: ctx.user,
            status: newStatus,
          },
        }
      );

      const updCategory = CategoryModel.updateMany(
        { restaurantId: ctx.restaurantId, items: { $elemMatch: { _id: id } } },
        {
          $set: {
            "items.$.status": newStatus,
          },
        }
      );

      await Promise.all([updItem, updCategory]);

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async addModifierGroupsToItem(
    itemId: string,
    modifierGroupIds: string[],
    ctx: Context
  ) {
    try {
      // Check if the Logged in user is allowed to update the menu or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Sanity checks
      for (let i = 0; i < modifierGroupIds.length; i++) {
        const elem = modifierGroupIds[i];
        if (!isAlphanumeric(elem)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      if (!isAlphanumeric(itemId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if item exist or not
      const item = await ItemModel.findOne({
        _id: itemId,
        restaurantId: ctx.restaurantId,
      })
        .select("modifierGroup")
        .lean();

      if (!item) {
        throw new ErrorWithProps("Please provide a valid item and try again!");
      }

      // Check if any modifier group is already added or not
      if (
        arraysHaveCommonElement<string>(
          item.modifierGroup.map((e) => e._id.toString()),
          modifierGroupIds
        )
      ) {
        throw new ErrorWithProps(
          "Some modifier group are already added in the item, please try again"
        );
      }

      // Check if modifier group exist or not
      const modifierGroups = await ModifierGroupModel.find({
        _id: { $in: modifierGroupIds },
        restaurantId: ctx.restaurantId,
      })
        .select("_id name pricingType")
        .lean();

      if (modifierGroups.length !== modifierGroupIds.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Add item to the modifier group
      await ModifierGroupModel.updateMany(
        {
          _id: { $in: modifierGroupIds },
          restaurantId: ctx.restaurantId,
          item: { $nin: [itemId] },
        },
        {
          $addToSet: {
            item: itemId,
          },
        }
      );

      // Create modifier group info with id
      const modifierGroupsWithId: ModifierGroupInfo[] = modifierGroups?.map(
        (el) => ({
          ...el,
          id: el?._id.toString(),
        })
      );

      // Finally update the item model
      await ItemModel.updateOne(
        {
          _id: itemId,
          restaurantId: ctx.restaurantId,
          "modifierGroup._id": { $nin: modifierGroupIds },
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $addToSet: {
            items: {
              $each: modifierGroupsWithId,
            },
          },
        }
      );

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async removeModifierGroupFromItem(
    itemId: string,
    modifierGroupId: string,
    ctx: Context
  ) {
    try {
      // Check if the logged in user has permission or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Sanity checks
      if (!isAlphanumeric(modifierGroupId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (!isAlphanumeric(itemId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if category exist or not
      const item = await ItemModel.findOne({
        _id: itemId,
        restaurantId: ctx.restaurantId,
        modifierGroup: { $elemMatch: { _id: modifierGroupId } },
      })
        .select("modifierGroup")
        .lean();

      if (!item) {
        throw new ErrorWithProps("Please provide a valid item and try again!");
      }

      // Check if modifier group exist or not
      const modifierGroup = await ModifierGroupModel.findOne({
        _id: modifierGroupId,
        restaurantId: ctx.restaurantId,
        item: { $in: [itemId] },
      })
        .select("_id")
        .lean();

      if (!modifierGroup) {
        throw new ErrorWithProps(
          "Please provide a valid modifier group and try again!"
        );
      }

      // Check if modifier group id is already in the menu or not
      if (!item.modifierGroup.map((e) => e.id).includes(modifierGroupId)) {
        throw new ErrorWithProps(
          "Modifier Group is not in the item, please try again"
        );
      }

      // Finaly remove the modifier group from the item
      const updModifierGroup = ModifierGroupModel.updateOne(
        {
          _id: modifierGroupId,
          restaurantId: ctx.restaurantId,
        },
        {
          $pull: {
            item: itemId,
          },
        }
      );

      const updItem = ItemModel.updateOne(
        {
          _id: itemId,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $pull: {
            modifierGroup: { _id: modifierGroupId },
          },
        }
      );

      await Promise.all([updItem, updModifierGroup]);

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }
}
