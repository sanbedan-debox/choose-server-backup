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
import { CategoryModel } from "../../categories/schema/category.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { RestaurantStatus } from "../../restaurant/interfaces/restaurant.enums";
import {
  Restaurant,
  RestaurantModel,
} from "../../restaurant/schema/restaurant.schema";
import { TaxRateModel } from "../../taxRate/schema/taxRate.schema";
import { MenuQueueType, MenuTypeEnum } from "../interfaces/menu.enum";
import {
  AddMenuInput,
  UpdateBulkMenuInput,
  UpdateMenuInput,
} from "../interfaces/menu.input";
import { MenuQueue } from "../queue/menu.queue";
import { CategoryInfo, Menu, MenuModel } from "../schema/menu.schema";

class MenuService {
  async addMenu(input: AddMenuInput, ctx: Context) {
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

      const { availability, categories, name, taxRateId, type } = input;

      // Check ids
      if (!isAlphanumeric(taxRateId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if any menu with same name is already added for given restaurant
      const checkMenuName = await MenuModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: name,
      }).lean();

      if (checkMenuName > 0) {
        throw new ErrorWithProps(
          `Menu with ${input?.name} name already exist, please try again!`
        );
      }

      // Check all input values
      const { error } = joiSchema.validate({
        name,
      });
      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      const isType = enumValidation(MenuTypeEnum, input?.type);

      if (!isType) {
        throw new ErrorWithProps("Invalid menu type given, please try again");
      }

      const tx = await TaxRateModel.findOne({
        _id: taxRateId.toString(),
      })
        .select("_id name salesTax")
        .lean();

      if (!tx) {
        throw new ErrorWithProps("Invalid tax rate given, please try again");
      }

      const availabilityCheck = availabilityValidation(availability);

      if (!availabilityCheck.success) {
        throw new ErrorWithProps(availabilityCheck.error);
      }

      let categoriesWithId: CategoryInfo[] = [];

      if ((categories ?? []).length > 0) {
        // Check all category id's
        for (let i = 0; i < categories.length; i++) {
          const cateItem = categories[i];
          if (!isAlphanumeric(cateItem)) {
            throw new ErrorWithProps("Something went wrong, please try again!");
          }
        }

        const cates = await CategoryModel.find({
          _id: { $in: categories },
          restaurantId: ctx.restaurantId,
        })
          .select("_id name status")
          .lean();

        if ((cates ?? []).length !== categories.length) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        categoriesWithId = cates.map((el) => ({
          ...el,
          id: el._id.toString(),
        }));
      }

      // Finally create menu and add it to the Menu model and in the restaurant model
      const menu = await MenuModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        availability,
        categories: categoriesWithId,
        name,
        taxes: tx,
        type,
      });

      if (!menu) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      await RestaurantModel.updateOne(
        {
          _id: ctx.restaurantId,
          status: RestaurantStatus.active,
        },
        {
          $addToSet: {
            menus: {
              _id: menu._id,
              id: menu._id.toString(),
              name: menu.name,
              type: menu.type,
            },
          },
        }
      );

      // Also add menu to the categories
      if (categoriesWithId.length > 0) {
        await CategoryModel.updateMany(
          {
            _id: { $in: input.categories },
            restaurantId: ctx.restaurantId,
          },
          {
            $addToSet: {
              menu: menu._id,
            },
          }
        );
      }

      await MenuQueue.add({
        type: MenuQueueType.NewMenuAdded,
        restaurantId: ctx.restaurantId,
        menuId: menu._id.toString(),
        menuType: type,
      });

      return true;
    } catch (error) {
      console.log(error);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateMenu(input: UpdateMenuInput, ctx: Context) {
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

      const { _id, availability, name, type } = input;

      // Sanity Checks
      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const isMenu = await MenuModel.countDocuments({ _id: _id }).lean();

      if (!isMenu) {
        throw new ErrorWithProps("Menu not found, please try again");
      }

      // Check input values and create update query
      let mainUpdQuery: UpdateQuery<Menu> = {
        updatedBy: ctx.user,
      };
      let restaurantUpdQuery: UpdateQuery<Restaurant> = {};

      //  Validate name
      if (name) {
        const { error } = joiSchema.validate({
          name: name,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        // Check same name
        const menuName = await MenuModel.countDocuments({
          restaurantId: ctx.restaurantId,
          name: name,
          _id: { $ne: _id },
        });

        if (menuName > 0) {
          throw new ErrorWithProps(
            `Menu with ${name} name already exists, please try a different name to continue`
          );
        }

        mainUpdQuery.name = name;
        restaurantUpdQuery = {
          ...restaurantUpdQuery,
          "menus.$.name": name,
        };
      }

      if (input.type) {
        const isType = enumValidation(MenuTypeEnum, input?.type);

        if (!isType) {
          throw new ErrorWithProps(
            "Invalid menu type provided, please try again!"
          );
        }

        mainUpdQuery.type = type;
        restaurantUpdQuery = {
          ...restaurantUpdQuery,
          "menus.$.type": type,
        };
      }

      if (input.availability) {
        const availabilityCheck = availabilityValidation(input.availability);

        if (!availabilityCheck.success) {
          throw new ErrorWithProps(availabilityCheck.error);
        }

        mainUpdQuery.availability = availability;
      }

      // Finally update the menu in menu model and restaurant model
      await MenuModel.updateOne(
        {
          _id: _id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: mainUpdQuery,
        }
      );

      if (Object.keys(restaurantUpdQuery).length > 0) {
        await RestaurantModel.updateOne(
          {
            _id: ctx.restaurantId,
            menus: { $elemMatch: { _id: _id } },
          },
          {
            $set: restaurantUpdQuery,
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateMenu(inputs: UpdateBulkMenuInput[], ctx: Context) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

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

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];

        const { _id, name } = input;

        // Sanity Checks
        if (!isAlphanumeric(_id)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        const isMenu = await MenuModel.countDocuments({ _id: _id }).lean();

        if (!isMenu) {
          throw new ErrorWithProps("Menu not found, please try again");
        }

        // Check input values and create update query
        let mainUpdQuery: UpdateQuery<Menu> = {
          updatedBy: ctx.user,
        };
        let restaurantUpdQuery: UpdateQuery<Restaurant> = {};

        //  Validate name
        if (name) {
          const { error } = joiSchema.validate({
            name: name,
          });

          if (error) {
            throw new ErrorWithProps(error.message.toString());
          }

          // Check same name
          const menuName = await MenuModel.countDocuments({
            restaurantId: ctx.restaurantId,
            name: name,
            _id: { $ne: _id },
          });

          if (menuName > 0) {
            throw new ErrorWithProps(
              `Menu with ${name} name already exists, please try a different name to continue`
            );
          }

          mainUpdQuery.name = name;
          restaurantUpdQuery = {
            ...restaurantUpdQuery,
            "menus.$.name": name,
          };
        }

        // Finally update the menu in menu model and restaurant model
        await MenuModel.updateOne(
          {
            _id: _id,
            restaurantId: ctx.restaurantId,
          },
          {
            $set: mainUpdQuery,
          },
          { session: dbSession }
        );

        if (Object.keys(restaurantUpdQuery).length > 0) {
          await RestaurantModel.updateOne(
            {
              _id: ctx.restaurantId,
              menus: { $elemMatch: { _id: _id } },
            },
            {
              $set: restaurantUpdQuery,
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

  async addCategoriesToMenu(
    categoryIds: string[],
    menuId: string,
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
      for (let i = 0; i < categoryIds.length; i++) {
        const cateId = categoryIds[i];
        if (!isAlphanumeric(cateId)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      if (!isAlphanumeric(menuId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if menu exist or not
      const menu = await MenuModel.findOne({
        _id: menuId,
        restaurantId: ctx.restaurantId,
      })
        .select("categories")
        .lean();

      if (!menu) {
        throw new ErrorWithProps("Please provide a valid menu and try again!");
      }

      // Check if any category is already added or not
      if (
        arraysHaveCommonElement<string>(
          menu.categories.map((e) => e._id.toString()),
          categoryIds
        )
      ) {
        throw new ErrorWithProps(
          "Some categories are already added in the menu, please try again"
        );
      }

      // Check if categories exist or not
      const categories = await CategoryModel.find({
        _id: { $in: categoryIds },
        restaurantId: ctx.restaurantId,
      })
        .select("_id name status")
        .lean();

      if (categories.length !== categoryIds.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Add menu for the category if not added
      await CategoryModel.updateMany(
        {
          _id: { $in: categoryIds },
          restaurantId: ctx.restaurantId,
          menu: { $nin: [menuId] },
        },
        {
          $addToSet: {
            menu: menuId,
          },
        }
      );

      // Create category info with id
      const categoryWithId: CategoryInfo[] = categories?.map((el) => ({
        ...el,
        id: el?._id.toString(),
      }));

      // Finally update the menu model
      await MenuModel.updateOne(
        {
          _id: menuId,
          restaurantId: ctx.restaurantId,
          "categories._id": { $nin: categoryIds },
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $addToSet: {
            categories: {
              $each: categoryWithId,
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

  async removeCategoryFromMenu(
    menuId: string,
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
      if (!isAlphanumeric(categoryId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      if (!isAlphanumeric(menuId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if menu exist or not
      const menu = await MenuModel.findOne({
        _id: menuId,
        restaurantId: ctx.restaurantId,
        categories: { $elemMatch: { _id: categoryId } },
      })
        .select("categories")
        .lean();

      if (!menu) {
        throw new ErrorWithProps("Please provide a valid menu and try again!");
      }

      // Check if menu exist or not
      const category = await CategoryModel.findOne({
        _id: categoryId,
        restaurantId: ctx.restaurantId,
        menu: { $in: [menuId] },
      })
        .select("_id")
        .lean();

      if (!category) {
        throw new ErrorWithProps(
          "Please provide a valid category and try again!"
        );
      }

      // Check if categoryId is already in the menu or not
      if (!menu.categories.map((e) => e.id).includes(categoryId)) {
        throw new ErrorWithProps(
          "Category is not in the menu, please try again"
        );
      }

      // Finaly remove the category from the menu
      const updCate = CategoryModel.updateOne(
        {
          _id: categoryId,
          restaurantId: ctx?.restaurantId,
        },
        {
          $pull: {
            menu: menuId,
          },
        }
      );

      const updMenu = MenuModel.updateOne(
        {
          _id: menuId,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $pull: {
            categories: { _id: categoryId },
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

  async getAllMenus(ctx: Context) {
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

      // Fetch all the menus for selected restaurant
      const menus = await MenuModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return menus;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getMenu(ctx: Context, id: string) {
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

      // Find the menu
      const menu = await MenuModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!menu) {
        throw new ErrorWithProps("Invalid menu provided, please try again");
      }

      return menu;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async changeMenuStatus(id: string, ctx: Context) {
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

      // Find the menu
      const menu = await MenuModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      })
        .select("_id status taxes categories type")
        .lean();

      if (!menu) {
        throw new ErrorWithProps("Invalid menu provided, please try again");
      }

      // Update the status for menu
      let newStatus: StatusEnum = StatusEnum.active;

      if (menu.status === StatusEnum.active) {
        newStatus = StatusEnum.inactive;
      }

      // If changing status to active make certain checks
      if (newStatus === StatusEnum.active) {
        // Check if any one category in menu is active
        const isAnyCategoryActive = menu.categories.some(
          (el) => el.status === StatusEnum.active
        );
        if (!isAnyCategoryActive) {
          throw new ErrorWithProps(
            "At least one active category must be present in the menu, please try again!"
          );
        }

        // Check if taxes are added for menu or not
        if (!menu.taxes) {
          throw new ErrorWithProps(
            "Tax rate must be added to the menu, please try again!"
          );
        }

        // Check if another menu with same type is active
        const otherActive = await MenuModel.countDocuments({
          _id: { $ne: id },
          status: StatusEnum.active,
          restaurantId: ctx.restaurantId,
          type: menu.type,
        }).lean();

        if (otherActive > 0) {
          throw new ErrorWithProps(
            "Another menu of same type is already active, please turn it off then try again!"
          );
        }
      }

      // Finally update the status in menu
      const updMenu = MenuModel.updateOne(
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

      await Promise.all([updMenu]);

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default MenuService;
