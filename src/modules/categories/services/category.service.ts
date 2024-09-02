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
} from "../../../utils/validations";
import { ItemModel } from "../../items/schema/item.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { Menu, MenuModel } from "../../menu/schema/menu.schema";
import {
  AddCategoryInput,
  UpdateBulkCategoryInput,
  UpdateCategoryInput,
} from "../interfaces/category.input";
import { Category, CategoryModel, ItemInfo } from "../schema/category.schema";

export class CategoryService {
  async addCategory(input: AddCategoryInput, ctx: Context) {
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

      const { availability, desc, items, name, status, visibility } = input;

      // Check if any category with same name is already added for given restaurant
      const checkSameName = await CategoryModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: name,
      }).lean();

      if (checkSameName > 0) {
        throw new ErrorWithProps(
          `Category with ${input?.name} name already exist, please try again!`
        );
      }

      // Check all input values
      const { error } = joiSchema.validate({
        name,
      });
      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      if (name.length > 60) {
        throw new ErrorWithProps(
          "Category name cannot be more than 60 characters, please try again!"
        );
      }

      if (desc !== null) {
        const { error } = joiSchema.validate({
          desc,
        });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (desc.length < 20 || desc.length > 160) {
          throw new ErrorWithProps(
            "Description must be more than 20 characters but less than 160 characters, please try again!"
          );
        }
      }

      const availabilityCheck = availabilityValidation(availability);

      if (!availabilityCheck.success) {
        throw new ErrorWithProps(availabilityCheck.error);
      }

      let itemWithId: ItemInfo[] = [];

      if ((items ?? []).length > 0) {
        // Check all items id's
        for (let i = 0; i < items.length; i++) {
          const itemElem = items[i];
          if (!isAlphanumeric(itemElem)) {
            throw new ErrorWithProps("Something went wrong, please try again!");
          }
        }

        const itemsFound = await ItemModel.find({
          _id: { $in: input?.items.map((el) => el?.toString()) },
          restaurantId: ctx?.restaurantId,
        })
          .select("_id name price status image")
          .lean();

        if (itemsFound?.length !== items.length) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        itemWithId = itemsFound?.map((el) => ({
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

      // Check if status can be true or not
      const anyItemActive = itemWithId.some(
        (e) => e.status === StatusEnum.active
      );
      if (status === StatusEnum.active && !anyItemActive) {
        throw new ErrorWithProps(
          "You must have atleast one active item to make this category active"
        );
      }

      // Finally create category and add it to the category model
      const category = await CategoryModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        availability,
        visibility,
        items: itemWithId,
        name,
        desc,
        status,
      });

      if (!category) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Also add category to the items
      if (itemWithId.length > 0) {
        await ItemModel.updateMany(
          {
            _id: { $in: items },
            restaurantId: ctx.restaurantId,
          },
          {
            $addToSet: {
              category: category._id,
            },
          }
        );
      }

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateCategory(input: UpdateCategoryInput, ctx: Context) {
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

      const { _id, availability, desc, name, status, visibility } = input;

      // Sanity checks
      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const isCategory = await CategoryModel.findOne({
        _id: _id,
      })
        .select("items")
        .lean();

      if (!isCategory) {
        throw new ErrorWithProps("Category not found, please try again");
      }

      // Check input values and create update query
      let mainUpdQuery: UpdateQuery<Category> = {
        updatedBy: ctx.user,
      };
      let menuUpdQuery: UpdateQuery<Menu> = {};

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
        const sameName = await CategoryModel.countDocuments({
          restaurantId: ctx.restaurantId,
          name: name,
          _id: { $ne: _id },
        });

        if (sameName > 0) {
          throw new ErrorWithProps(
            `Category with ${name} name already exists, please try a different name to continue`
          );
        }

        mainUpdQuery.name = name;
        menuUpdQuery = {
          ...menuUpdQuery,
          "categories.$.name": name,
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

      // Check if status can be true or not
      if (status !== null) {
        const anyItemActive = isCategory.items.some(
          (e) => e.status === StatusEnum.active
        );
        if (status === StatusEnum.active && !anyItemActive) {
          throw new ErrorWithProps(
            "You must have atleast one active item to make this category active"
          );
        }

        mainUpdQuery.status = status;
        menuUpdQuery = {
          ...menuUpdQuery,
          "categories.$.status": status,
        };
      }

      // Finally update the category in category model and menu model
      await CategoryModel.updateOne(
        {
          _id: _id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: mainUpdQuery,
        }
      );

      if (Object.keys(menuUpdQuery).length > 0) {
        await MenuModel.updateOne(
          {
            restaurantId: ctx.restaurantId,
            categories: { $elemMatch: { _id: _id } },
          },
          {
            $set: menuUpdQuery,
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateCategory(inputs: UpdateBulkCategoryInput[], ctx: Context) {
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

        const isCategory = await CategoryModel.findOne({
          _id: _id,
        })
          .select("items name")
          .lean();

        if (!isCategory) {
          throw new ErrorWithProps("Category not found, please try again");
        }

        // Check input values and create update query
        let mainUpdQuery: UpdateQuery<Category> = {
          updatedBy: ctx.user,
        };
        let menuUpdQuery: UpdateQuery<Menu> = {};

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
          const sameName = await CategoryModel.countDocuments({
            restaurantId: ctx.restaurantId,
            name: name,
            _id: { $ne: _id },
          });

          if (sameName > 0) {
            throw new ErrorWithProps(
              `Category with ${name} name already exists, please try a different name to continue`
            );
          }

          mainUpdQuery.name = name;
          menuUpdQuery = {
            ...menuUpdQuery,
            "categories.$.name": name,
          };
        }

        // Check if status can be true or not
        if (status !== null) {
          const anyItemActive = isCategory.items.some(
            (e) => e.status === StatusEnum.active
          );
          if (status === StatusEnum.active && !anyItemActive) {
            throw new ErrorWithProps(
              `You must have atleast one active item in ${isCategory.name} category to make it active`
            );
          }

          mainUpdQuery.status = status;
          menuUpdQuery = {
            ...menuUpdQuery,
            "categories.$.status": status,
          };
        }

        // Finally update the category in category model and menu model
        await CategoryModel.updateOne(
          {
            _id: _id,
            restaurantId: ctx.restaurantId,
          },
          {
            $set: mainUpdQuery,
          },
          { session: dbSession }
        );

        if (Object.keys(menuUpdQuery).length > 0) {
          await MenuModel.updateOne(
            {
              restaurantId: ctx.restaurantId,
              categories: { $elemMatch: { _id: _id } },
            },
            {
              $set: menuUpdQuery,
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

  async getCategory(id: string, ctx: Context) {
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

      // Find the category
      const category = await CategoryModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!category) {
        throw new ErrorWithProps("Invalid category provided, please try again");
      }

      return category;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getCategories(ctx: Context) {
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

      // Fetch all the categories for selected restaurant
      const categories = await CategoryModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return categories;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async changeCategoryStatus(id: string, ctx: Context) {
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

      // Find the category
      const category = await CategoryModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      })
        .select("_id status menus items")
        .lean();

      if (!category) {
        throw new ErrorWithProps("Invalid category provided, please try again");
      }

      // Update the status for category
      let newStatus: StatusEnum = StatusEnum.active;

      if (category.status === StatusEnum.active) {
        newStatus = StatusEnum.inactive;
      }

      // If changing status to active make certain checks
      if (newStatus === StatusEnum.active) {
        // Check if any one item in category is active
        const isAnyActive = category.items.some(
          (el) => el.status === StatusEnum.active
        );
        if (!isAnyActive) {
          throw new ErrorWithProps(
            "At least one active items must be present in the category, please try again!"
          );
        }
      }

      // Finally update the status in category and menu
      const updCate = CategoryModel.updateOne(
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

      const updMenu = MenuModel.updateMany(
        {
          restaurantId: ctx.restaurantId,
          categories: { $elemMatch: { _id: id } },
        },
        {
          $set: {
            "categories.$.status": newStatus,
          },
        }
      );

      await Promise.all([updCate, updMenu]);

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async addItemsToCategory(
    itemIds: string[],
    categoryId: string,
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
      for (let i = 0; i < itemIds.length; i++) {
        const itemElem = itemIds[i];
        if (!isAlphanumeric(itemElem)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      if (!isAlphanumeric(categoryId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if category exist or not
      const category = await CategoryModel.findOne({
        _id: categoryId,
        restaurantId: ctx.restaurantId,
      })
        .select("items")
        .lean();

      if (!category) {
        throw new ErrorWithProps(
          "Please provide a valid category and try again!"
        );
      }

      // Check if any item is already added or not
      if (
        arraysHaveCommonElement<string>(
          category.items.map((e) => e._id.toString()),
          itemIds
        )
      ) {
        throw new ErrorWithProps(
          "Some items are already added in the category, please try again"
        );
      }

      // Check if items exist or not
      const items = await ItemModel.find({
        _id: { $in: itemIds },
        restaurantId: ctx.restaurantId,
      })
        .select("_id name price status image")
        .lean();

      if (items.length !== itemIds.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Add category to the items
      await ItemModel.updateMany(
        {
          _id: { $in: itemIds },
          restaurantId: ctx.restaurantId,
          category: { $nin: [categoryId] },
        },
        {
          $addToSet: {
            category: categoryId,
          },
        }
      );

      // Create item info with id
      const itemsWithId: ItemInfo[] = items?.map((el) => ({
        ...el,
        id: el?._id.toString(),
      }));

      // Finally update the menu model
      await CategoryModel.updateOne(
        {
          _id: categoryId,
          restaurantId: ctx.restaurantId,
          "items._id": { $nin: itemIds },
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $addToSet: {
            items: {
              $each: itemsWithId,
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

  async removeItemFromCategory(
    categoryId: string,
    itemId: string,
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
      if (!isAlphanumeric(categoryId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (!isAlphanumeric(itemId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if category exist or not
      const category = await CategoryModel.findOne({
        _id: categoryId,
        restaurantId: ctx.restaurantId,
        items: { $elemMatch: { _id: itemId } },
      })
        .select("items")
        .lean();

      if (!category) {
        throw new ErrorWithProps(
          "Please provide a valid category and try again!"
        );
      }

      // Check if item exist or not
      const item = await ItemModel.findOne({
        _id: itemId,
        restaurantId: ctx.restaurantId,
        category: { $in: [categoryId] },
      })
        .select("_id")
        .lean();

      if (!item) {
        throw new ErrorWithProps("Please provide a valid item and try again!");
      }

      // Check if categoryId is already in the menu or not
      if (!category.items.map((e) => e.id).includes(itemId)) {
        throw new ErrorWithProps(
          "Item is not in the category, please try again"
        );
      }

      // Finaly remove the item from the category
      const updItem = ItemModel.updateOne(
        {
          _id: itemId,
          restaurantId: ctx.restaurantId,
        },
        {
          $pull: {
            category: categoryId,
          },
        }
      );

      const updCategory = CategoryModel.updateOne(
        {
          _id: categoryId,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $pull: {
            items: { _id: itemId },
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
}
