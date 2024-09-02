import { mongoose } from "@typegoose/typegoose";
import { ErrorWithProps } from "mercurius";
import { FlattenMaps, UpdateQuery } from "mongoose";
import { FilterOperatorsEnum } from "../../../types/common.enum";
import { PaginatedFilter } from "../../../types/common.input";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import { isAlphanumeric, joiSchema } from "../../../utils/validations";
import { ItemModel } from "../../items/schema/item.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import {
  AddSubCategoryInput,
  UpdateBulkSubCategoryInput,
  UpdateSubCategoryInput,
} from "../interfaces/subCategories.input";
import { SubCategory, SubCategoryModel } from "../schema/subCategories.schema";

export class SubCategoryService {
  async addSubCategory(
    input: AddSubCategoryInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      // Check if logged in User is allowed to add subCategories or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { error } = joiSchema.validate({
        name: input.name,
      });
      if (error) {
        throw new ErrorWithProps(error.message.toString());
      }

      if (input.name.length > 60) {
        throw new ErrorWithProps(
          "Sub-Category name cannot be more than 60 characters, please try again!"
        );
      }

      if (input.desc !== null) {
        const { error } = joiSchema.validate({
          desc: input.desc,
        });
        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (input.desc.length < 20 || input.desc.length > 160) {
          throw new ErrorWithProps(
            "Description must be more than 20 characters but less than 160 characters, please try again!"
          );
        }
      }

      // Check sub category with same name exist or not
      const checkSameName = await SubCategoryModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: input.name,
      }).lean();

      if (checkSameName > 0) {
        throw new ErrorWithProps(
          `Sub category with the name ${input.name} already exist, please try a different name`
        );
      }

      // Finally add the sub category
      await SubCategoryModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        name: input.name,
        desc: input.desc,
      });

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateSubCategory(
    input: UpdateSubCategoryInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      //Check if the Logged in user is allowed to update the subCategory or not
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values and create update query
      if (!isAlphanumeric(input.id)) {
        throw new ErrorWithProps("Something went wrong, please try again");
      }

      let update: UpdateQuery<SubCategory> = {
        updatedBy: ctx.user,
      };
      let updateItemSubCate = {};

      // Name
      if (input.name) {
        const { error } = joiSchema.validate({
          name: input.name,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        // Check sub category with same name exist or not
        const checkSameName = await SubCategoryModel.countDocuments({
          _id: { $ne: input.id },
          restaurantId: ctx.restaurantId,
          name: input.name,
        }).lean();

        if (checkSameName <= 0) {
          throw new ErrorWithProps(
            `Sub category with the name ${input.name} already exist, please try a different name`
          );
        }

        update = {
          ...update,
          name: input.name,
        };

        updateItemSubCate = {
          ...updateItemSubCate,
          "subCategory.name": input.name,
        };
      }

      // Desc
      if (input.desc) {
        const { error } = joiSchema.validate({
          desc: input.desc,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        update = {
          ...update,
          desc: input.desc,
        };

        updateItemSubCate = {
          ...updateItemSubCate,
          "subCategory.desc": input.desc,
        };
      }

      // Check if sub category exist or not
      const checkSubCategoryValid = await SubCategoryModel.countDocuments({
        _id: input.id,
        restaurantId: ctx.restaurantId,
        name: { $ne: null },
        desc: { $ne: null },
      }).lean();

      if (checkSubCategoryValid <= 0) {
        throw new ErrorWithProps("Sub Category not found, please try again!");
      }

      // Finally update the sub category
      await SubCategoryModel.updateOne({ _id: input.id }, { $set: update });

      await ItemModel.updateOne(
        { "subCategory.id": input.id },
        {
          $set: updateItemSubCate,
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateSubCategory(
    inputs: UpdateBulkSubCategoryInput[],
    ctx: Context
  ): Promise<boolean> {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Check if the Logged in user is allowed to update the subCategory or not
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

        // Check input values and create update query
        if (!isAlphanumeric(input.id)) {
          throw new ErrorWithProps("Something went wrong, please try again");
        }

        let update: UpdateQuery<SubCategory> = {
          updatedBy: ctx.user,
        };
        let updateItemSubCate = {};

        // Name
        if (input.name) {
          const { error } = joiSchema.validate({
            name: input.name,
          });

          if (error) {
            throw new ErrorWithProps(error.message.toString());
          }

          // Check sub category with same name exist or not
          const checkSameName = await SubCategoryModel.countDocuments({
            _id: { $ne: input.id },
            restaurantId: ctx.restaurantId,
            name: input.name,
          }).lean();

          if (checkSameName <= 0) {
            throw new ErrorWithProps(
              `Sub category with the name ${input.name} already exist, please try a different name`
            );
          }

          update = {
            ...update,
            name: input.name,
          };

          updateItemSubCate = {
            ...updateItemSubCate,
            "subCategory.name": input.name,
          };
        }

        // Check if sub category exist or not
        const checkSubCategoryValid = await SubCategoryModel.countDocuments({
          _id: input.id,
          restaurantId: ctx.restaurantId,
          name: { $ne: null },
          desc: { $ne: null },
        }).lean();

        if (checkSubCategoryValid <= 0) {
          throw new ErrorWithProps("Sub Category not found, please try again!");
        }

        // Finally update the sub category
        await SubCategoryModel.updateOne(
          { _id: input.id },
          { $set: update },
          { session: dbSession }
        );

        await ItemModel.updateOne(
          { "subCategory.id": input.id },
          {
            $set: updateItemSubCate,
          },
          { session: dbSession }
        );
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

  async getSubCategory(id: string, ctx: Context): Promise<SubCategory> {
    try {
      // Check input values
      if (!isAlphanumeric(id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if logged in user has required permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const subCategory = await SubCategoryModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!subCategory) {
        throw new ErrorWithProps("Sub Category not found, please try again!");
      }

      return subCategory;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getSubCategories(filter: PaginatedFilter, page: number, ctx: Context) {
    try {
      // Check if logged in user has required permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      let matchingData: { [key: string]: any } = {};
      let rowCount = 6;
      let customFilter = !!(
        (typeof filter?.field === "number" ||
          typeof filter?.field === "string") &&
        filter.value !== ""
      );
      // Master common value (number)
      if (filter && customFilter) {
        let filterField = filter.field;
        if (filter?.field.includes("name") || filter?.field.includes("desc")) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            filterField = `${filter.field}.value`;
            matchingData[filterField] = { $regex: `(?i)${filter.value}` };
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        } else if (filter.field) {
          if (filter?.operator === FilterOperatorsEnum.any) {
            matchingData[filter.field] = filter.value;
          } else {
            throw new ErrorWithProps(`Invalid operator: ${filter?.operator}`); //
          }
        }
      } else {
        matchingData = {};
      }

      let subCategories: (FlattenMaps<SubCategory> &
        Required<{ _id: string }>)[];
      if (customFilter) {
        subCategories = await SubCategoryModel.find({
          restaurantId: ctx.restaurantId,
          ...matchingData,
        })
          .limit(rowCount)
          .skip((page ?? 0) * rowCount)
          .lean();
      } else {
        subCategories = await SubCategoryModel.find({
          restaurantId: ctx.restaurantId,
        })
          .limit(rowCount)
          .skip((page ?? 0) * rowCount)
          .lean();
      }

      return subCategories ?? [];
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }
}
