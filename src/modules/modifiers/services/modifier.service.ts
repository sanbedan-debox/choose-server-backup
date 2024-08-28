import { mongoose } from "@typegoose/typegoose";
import { ErrorWithProps } from "mercurius";
import { UpdateQuery } from "mongoose";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import {
  arraysHaveCommonElement,
  enumValidation,
  isAlphanumeric,
  joiSchema,
} from "../../../utils/validations";
import { Item, ItemModel } from "../../items/schema/item.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { PriceTypeEnum } from "../interfaces/modifier.enum";
import {
  AddModifierGroupInput,
  AddModifierInput,
  UpdateBulkModifierGroupInput,
  UpdateBulkModifierInput,
  UpdateModifierGroupInput,
  UpdateModifierInput,
} from "../interfaces/modifier.input";
import {
  Modifier,
  ModifierGroup,
  ModifierGroupModel,
  ModifierInfo,
  ModifierModel,
} from "../schema/modifier.schema";

export class ModifierService {
  // Modifier
  async addModifier(input: AddModifierInput, ctx: Context) {
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

      const { desc, name, isItem, preSelect, price } = input;

      // Check input values
      const { error } = joiSchema.validate({ name, desc });

      if (error) {
        throw new ErrorWithProps(error.message);
      }

      if (price < 0) {
        throw new ErrorWithProps(
          "Price cannot be less than zero, please try again!"
        );
      }

      if (name.length > 60) {
        throw new ErrorWithProps(
          "Modifier name cannot be more than 60 characters, please try again!"
        );
      }

      if (desc.length < 20 || desc.length > 160) {
        throw new ErrorWithProps(
          "Description must be more than 20 characters but less than 160 characters, please try again!"
        );
      }

      // Check if any modifier with same name is already added for given restaurant
      const checkSameName = await ModifierModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: name,
      }).lean();

      if (checkSameName > 0) {
        throw new ErrorWithProps(
          `Modifier with ${input?.name} name already exist, please try again!`
        );
      }

      await ModifierModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        desc,
        name,
        isItem,
        price,
        preSelect,
      });

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateModifier(input: UpdateModifierInput, ctx: Context) {
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

      const { _id, desc, name, isItem, preSelect, price } = input;

      // Sanity checks
      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const isModifier = await ModifierModel.countDocuments({
        _id: _id,
      }).lean();

      if (!isModifier) {
        throw new ErrorWithProps("Modifier not found, please try again");
      }

      // Check input values and create update query
      let mainUpdQuery: UpdateQuery<Modifier> = {
        updatedBy: ctx.user,
      };
      let mgUpdQuery: UpdateQuery<ModifierGroup> = {};

      // Name
      if (name) {
        const { error } = joiSchema.validate({
          name: name,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (name.length > 60) {
          throw new ErrorWithProps(
            "Modifier name cannot be more than 60 characters, please try again!"
          );
        }

        const checkSameName = await ModifierModel.countDocuments({
          restaurantId: ctx.restaurantId,
          name: name,
        }).lean();

        if (checkSameName > 0) {
          throw new ErrorWithProps(
            `Modifier with ${name} name already exist, please try again!`
          );
        }

        mainUpdQuery.name = name;
        mgUpdQuery = {
          ...mgUpdQuery,
          "modifiers.$.name": name,
        };
      }

      // Desc
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
        mgUpdQuery = {
          ...mgUpdQuery,
          "modifiers.$.desc": desc,
        };
      }

      // Price
      if (price !== null) {
        if (price < 0) {
          throw new ErrorWithProps(
            "Price cannot be less than zero, please try again!"
          );
        }

        mainUpdQuery.price = price;
      }

      // Preselect
      if (input.preSelect !== null) {
        mainUpdQuery.preSelect = preSelect;
        mgUpdQuery = {
          ...mgUpdQuery,
          "modifiers.$.preSelect": preSelect,
        };
      }

      // Is Item
      if (input.isItem !== null) {
        mainUpdQuery.isItem = isItem;
        mgUpdQuery = {
          ...mgUpdQuery,
          "modifiers.$.isItem": isItem,
        };
      }

      // Finally update the modifier in modifier model and modifier group model
      await ModifierModel.updateOne(
        {
          _id: _id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: mainUpdQuery,
        }
      );

      if (Object.keys(mgUpdQuery).length > 0) {
        await ModifierGroupModel.updateOne(
          {
            restaurantId: ctx.restaurantId,
            modifiers: { $elemMatch: { _id: _id } },
          },
          {
            $set: mgUpdQuery,
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateModifiers(inputs: UpdateBulkModifierInput[], ctx: Context) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Check if logged in user have permission or not
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

        const { _id, name, price } = input;

        // Sanity checks
        if (!isAlphanumeric(_id)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        const isModifier = await ModifierModel.countDocuments({
          _id: _id,
        }).lean();

        if (!isModifier) {
          throw new ErrorWithProps("Invalid modifier found, please try again");
        }

        // Check input values and create update query
        let mainUpdQuery: UpdateQuery<Modifier> = {
          updatedBy: ctx.user,
        };
        let mgUpdQuery: UpdateQuery<ModifierGroup> = {};

        // Name
        if (name) {
          const { error } = joiSchema.validate({
            name: name,
          });

          if (error) {
            throw new ErrorWithProps(error.message.toString());
          }

          if (name.length > 60) {
            throw new ErrorWithProps(
              "Modifier name cannot be more than 60 characters, please try again!"
            );
          }

          const checkSameName = await ModifierModel.countDocuments({
            restaurantId: ctx.restaurantId,
            name: name,
          }).lean();

          if (checkSameName > 0) {
            throw new ErrorWithProps(
              `Modifier with ${name} name already exist, please try again!`
            );
          }

          mainUpdQuery.name = name;
          mgUpdQuery = {
            ...mgUpdQuery,
            "modifiers.$.name": name,
          };
        }

        // Price
        if (price !== null) {
          if (price < 0) {
            throw new ErrorWithProps(
              "Price cannot be less than zero, please try again!"
            );
          }

          mainUpdQuery.price = price;
        }

        // Finally update the modifier in modifier model and modifier group model
        await ModifierModel.updateOne(
          {
            _id: _id,
            restaurantId: ctx.restaurantId,
          },
          {
            $set: mainUpdQuery,
          },
          { session: dbSession }
        );

        if (Object.keys(mgUpdQuery).length > 0) {
          await ModifierGroupModel.updateOne(
            {
              restaurantId: ctx.restaurantId,
              modifiers: { $elemMatch: { _id: _id } },
            },
            {
              $set: mgUpdQuery,
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

  async getModifier(id: string, ctx: Context) {
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

      // Find the modifier
      const modi = await ModifierModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!modi) {
        throw new ErrorWithProps("Invalid modifier provided, please try again");
      }

      return modi;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getModifiers(ctx: Context) {
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

      // Fetch all the modifiers for selected restaurant
      const modifiers = await ModifierModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return modifiers;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  // Modifier Group
  async addModifierGroup(
    input: AddModifierGroupInput,
    modifiers: string[],
    ctx: Context
  ) {
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

      // Modifiers
      if (modifiers.length < 0) {
        throw new ErrorWithProps(
          "Atleast one modifier is required, please try again!"
        );
      }

      const {
        desc,
        name,
        maxSelections,
        minSelections,
        optional,
        price,
        pricingType,
        multiSelect,
      } = input;

      // Check input values
      const { error } = joiSchema.validate({ name, desc });

      const priceTypeValidation = enumValidation(PriceTypeEnum, pricingType);

      if (!priceTypeValidation) {
        throw new ErrorWithProps(
          "Please enter valid pricing type and try again!"
        );
      }

      if (error) {
        throw new ErrorWithProps(error.message);
      }

      if (price < 0 && pricingType === PriceTypeEnum.SamePrice) {
        throw new ErrorWithProps(
          "Price should be greater than 0, please try again!"
        );
      }

      if (name.length > 60) {
        throw new ErrorWithProps(
          "Item name cannot be more than 60 characters, please try again!"
        );
      }

      if (desc.length < 20 || desc.length > 160) {
        throw new ErrorWithProps(
          "Description must be more than 20 characters but less than 160 characters, please try again!"
        );
      }

      // If not optional then min selection must be more than 0
      if (!optional && minSelections <= 0) {
        throw new ErrorWithProps(
          "Minimum selection must be more than 0 if modifier group is not optional, please try again"
        );
      }

      if (maxSelections < minSelections) {
        throw new ErrorWithProps(
          "Maximum selections cannot be less than minimum selections, please try again"
        );
      }

      // Check if any item with same name is already added for given restaurant
      const checkSameName = await ModifierGroupModel.countDocuments({
        restaurantId: ctx.restaurantId,
        name: name,
      }).lean();

      if (checkSameName > 0) {
        throw new ErrorWithProps(
          `Modifier Group with ${name} name already exist, please try again!`
        );
      }

      let modifiersWithId: ModifierInfo[] = [];

      if ((modifiers ?? []).length > 0) {
        // Check all id's
        for (let i = 0; i < modifiers.length; i++) {
          const elem = modifiers[i];
          if (!isAlphanumeric(elem)) {
            throw new ErrorWithProps("Something went wrong, please try again!");
          }
        }

        const modifiersFound = await ModifierModel.find({
          _id: { $in: modifiers },
          restaurantId: ctx.restaurantId,
        })
          .select("_id name desc price preSelect isItem")
          .lean();

        if (modifiersFound?.length !== modifiers.length) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        if (input?.minSelections > modifiers?.length) {
          throw new ErrorWithProps(
            `Cannot add less than ${input?.minSelections} modifiers.`
          );
        }

        modifiersWithId = modifiersFound?.map((el) => ({
          ...el,
          price:
            pricingType === PriceTypeEnum.FreeOfCharge
              ? 0
              : pricingType === PriceTypeEnum.IndividualPrice
              ? el.price
              : price,
          id: el._id.toString(),
        }));
      }

      // Finally create the modifier group
      const mg = await ModifierGroupModel.create({
        user: ctx.user,
        restaurantId: ctx.restaurantId,
        name,
        desc,
        price,
        pricingType,
        maxSelections,
        minSelections,
        optional,
        multiSelect,
        modifiers: modifiersWithId,
      });

      // Also add modifier group to the modifier
      if (modifiersWithId.length > 0) {
        await ModifierModel.updateMany(
          {
            _id: { $in: modifiers },
            restaurantId: ctx.restaurantId,
          },
          {
            $addToSet: {
              modifierGroup: mg._id.toString(),
            },
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateModifierGroup(input: UpdateModifierGroupInput, ctx: Context) {
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
        desc,
        name,
        maxSelections,
        minSelections,
        optional,
        price,
        pricingType,
        multiSelect,
      } = input;

      // Sanity checks
      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const mg = await ModifierGroupModel.findOne({
        _id: _id,
      })
        .select("pricingType modifiers price")
        .lean();

      if (!mg) {
        throw new ErrorWithProps("Modifier group not found, please try again");
      }

      // Check input values and create update query
      let mainUpdQuery: UpdateQuery<ModifierGroup> = {
        updatedBy: ctx.user,
      };
      let itemUpdQuery: UpdateQuery<Item> = {};

      // Name
      if (name) {
        const { error } = joiSchema.validate({
          name: name,
        });

        if (error) {
          throw new ErrorWithProps(error.message.toString());
        }

        if (name.length > 60) {
          throw new ErrorWithProps(
            "Modifier group name cannot be more than 60 characters, please try again!"
          );
        }

        const checkSameName = await ModifierModel.countDocuments({
          restaurantId: ctx.restaurantId,
          name: name,
        }).lean();

        if (checkSameName > 0) {
          throw new ErrorWithProps(
            `Modifier group with ${name} name already exist, please try again!`
          );
        }

        mainUpdQuery.name = name;
        itemUpdQuery = {
          ...itemUpdQuery,
          "modifierGroup.$.name": name,
        };
      }

      // Desc
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
        itemUpdQuery = {
          ...itemUpdQuery,
          "modifierGroup.$.desc": desc,
        };
      }

      // Min, Max selections and optional
      if (
        minSelections !== null &&
        maxSelections !== null &&
        optional !== null
      ) {
        // If not optional then min selection must be more than 0
        if (!optional && minSelections <= 0) {
          throw new ErrorWithProps(
            "Minimum selection must be more than 0 if modifier group is not optional, please try again"
          );
        }

        if (maxSelections < minSelections) {
          throw new ErrorWithProps(
            "Maximum selections cannot be less than minimum selections, please try again"
          );
        }

        mainUpdQuery.minSelections = minSelections;
        mainUpdQuery.maxSelections = maxSelections;
        mainUpdQuery.optional = optional;
      }

      if (multiSelect !== null) {
        mainUpdQuery.multiSelect = multiSelect;
      }

      if (pricingType) {
        const priceTypeValidation = enumValidation(PriceTypeEnum, pricingType);

        if (!priceTypeValidation) {
          throw new ErrorWithProps(
            "Please enter valid pricing type and try again!"
          );
        }

        if (pricingType !== mg.pricingType) {
          if ((price ?? 0) <= 0 && pricingType === PriceTypeEnum.SamePrice) {
            throw new ErrorWithProps(
              "Price should be greater than 0, please try again!"
            );
          }

          if (price !== mg.price) {
            mainUpdQuery.price = price;
          }

          mainUpdQuery.pricingType = pricingType;
          itemUpdQuery = {
            ...itemUpdQuery,
            "modifierGroup.$.pricingType": pricingType,
          };

          let modifiersWithId: ModifierInfo[] = [];

          for (let i = 0; i < mg.modifiers.length; i++) {
            const modi = mg.modifiers[i];
            const modifier = await ModifierModel.findOne({ _id: modi._id })
              .select("price")
              .lean();

            modifiersWithId.push({
              ...modi,
              price:
                pricingType === PriceTypeEnum.FreeOfCharge
                  ? 0
                  : pricingType === PriceTypeEnum.IndividualPrice
                  ? modifier.price
                  : price,
            });
          }

          mainUpdQuery.modifiers = modifiersWithId;
        }
      }

      // Finally update the modifier group in modifier group and item model
      await ModifierGroupModel.updateOne(
        {
          _id: _id,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: mainUpdQuery,
        }
      );

      if (Object.keys(itemUpdQuery).length > 0) {
        await ItemModel.updateOne(
          {
            restaurantId: ctx.restaurantId,
            modifierGroup: { $elemMatch: { _id: _id } },
          },
          {
            $set: itemUpdQuery,
          }
        );
      }

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async bulkUpdateModifierGroups(
    inputs: UpdateBulkModifierGroupInput[],
    ctx: Context
  ) {
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

        const { _id, name } = input;

        // Sanity checks
        if (!isAlphanumeric(_id)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }

        const mg = await ModifierGroupModel.findOne({
          _id: _id,
        })
          .select("_id")
          .lean();

        if (!mg) {
          throw new ErrorWithProps(
            "Modifier group not found, please try again"
          );
        }

        // Check input values and create update query
        let mainUpdQuery: UpdateQuery<ModifierGroup> = {
          updatedBy: ctx.user,
        };
        let itemUpdQuery: UpdateQuery<Item> = {};

        // Name
        if (name) {
          const { error } = joiSchema.validate({
            name: name,
          });

          if (error) {
            throw new ErrorWithProps(error.message.toString());
          }

          if (name.length > 60) {
            throw new ErrorWithProps(
              "Modifier group name cannot be more than 60 characters, please try again!"
            );
          }

          const checkSameName = await ModifierModel.countDocuments({
            restaurantId: ctx.restaurantId,
            name: name,
          }).lean();

          if (checkSameName > 0) {
            throw new ErrorWithProps(
              `Modifier group with ${name} name already exist, please try again!`
            );
          }

          mainUpdQuery.name = name;
          itemUpdQuery = {
            ...itemUpdQuery,
            "modifierGroup.$.name": name,
          };
        }

        // Finally update the modifier group in modifier group and item model
        await ModifierGroupModel.updateOne(
          {
            _id: _id,
            restaurantId: ctx.restaurantId,
          },
          {
            $set: mainUpdQuery,
          },
          { session: dbSession }
        );

        if (Object.keys(itemUpdQuery).length > 0) {
          await ItemModel.updateOne(
            {
              restaurantId: ctx.restaurantId,
              modifierGroup: { $elemMatch: { _id: _id } },
            },
            {
              $set: itemUpdQuery,
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

  async addModifierToGroup(
    modifierIds: string[],
    modifierGroupId: string,
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
      for (let i = 0; i < modifierIds.length; i++) {
        const elem = modifierIds[i];
        if (!isAlphanumeric(elem)) {
          throw new ErrorWithProps("Something went wrong, please try again!");
        }
      }

      if (!isAlphanumeric(modifierGroupId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if modifier group exist or not
      const modiGroup = await ModifierGroupModel.findOne({
        _id: modifierGroupId,
        restaurantId: ctx.restaurantId,
      })
        .select("modifiers pricingType price")
        .lean();

      if (!modiGroup) {
        throw new ErrorWithProps(
          "Please provide a valid modifier group and try again!"
        );
      }

      // Check if any modifier group is already added or not
      if (
        arraysHaveCommonElement<string>(
          modiGroup.modifiers.map((e) => e._id.toString()),
          modifierIds
        )
      ) {
        throw new ErrorWithProps(
          "Some modifier are already added in the modifier group, please try again"
        );
      }

      // Check if modifier exist or not
      const modifiers = await ModifierModel.find({
        _id: { $in: modifierIds },
        restaurantId: ctx.restaurantId,
      })
        .select("_id name desc price preSelect isItem")
        .lean();

      if (modifiers.length !== modifierIds.length) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Add modifier group to modifier
      await ModifierModel.updateMany(
        {
          _id: { $in: modifierIds },
          restaurantId: ctx.restaurantId,
          modifierGroup: { $nin: [modifierGroupId] },
        },
        {
          $addToSet: {
            modifierGroup: modifierGroupId,
          },
        }
      );

      // Create modifier group info with id
      const modifiersWithId: ModifierInfo[] = modifiers?.map((el) => ({
        ...el,
        price:
          modiGroup.pricingType === PriceTypeEnum.FreeOfCharge
            ? 0
            : modiGroup.pricingType === PriceTypeEnum.IndividualPrice
            ? el.price
            : modiGroup.price,
        id: el?._id.toString(),
      }));

      // Finally update the item model
      await ModifierGroupModel.updateOne(
        {
          _id: modifierGroupId,
          restaurantId: ctx.restaurantId,
          "modifiers._id": { $nin: modifierIds },
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $addToSet: {
            modifiers: {
              $each: modifiersWithId,
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

  async removeModifierFromGroup(
    modifierId: string,
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

      if (!isAlphanumeric(modifierId)) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if modifier group exist or not
      const modiGroup = await ModifierGroupModel.findOne({
        _id: modifierGroupId,
        restaurantId: ctx.restaurantId,
        modifiers: { $elemMatch: { _id: modifierId } },
      })
        .select("modifiers")
        .lean();

      if (!modiGroup) {
        throw new ErrorWithProps(
          "Please provide a valid modifier group and try again!"
        );
      }

      // Check if modifier exist or not
      const modi = await ModifierModel.findOne({
        _id: modifierId,
        restaurantId: ctx.restaurantId,
        modifierGroup: { $in: [modifierGroupId] },
      })
        .select("_id")
        .lean();

      if (!modi) {
        throw new ErrorWithProps(
          "Please provide a valid modifier and try again!"
        );
      }

      // Check if modifier id is already in the modifier group or not
      if (!modiGroup.modifiers.map((e) => e.id).includes(modifierId)) {
        throw new ErrorWithProps(
          "Modifier is not in the modifier group, please try again"
        );
      }

      // Finaly remove the modifier from the modifier group
      const updModifier = ModifierModel.updateOne(
        {
          _id: modifierId,
          restaurantId: ctx.restaurantId,
        },
        {
          $pull: {
            modifierGroup: modifierGroupId,
          },
        }
      );

      const updModifierGroup = ModifierGroupModel.updateOne(
        {
          _id: modifierGroupId,
          restaurantId: ctx.restaurantId,
        },
        {
          $set: {
            updatedBy: ctx.user,
          },
          $pull: {
            modifiers: { _id: modifierId },
          },
        }
      );

      await Promise.all([updModifierGroup, updModifier]);

      return true;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getModifierGroup(id: string, ctx: Context) {
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

      // Find the modifier group
      const modiGroup = await ModifierGroupModel.findOne({
        _id: id,
        restaurantId: ctx.restaurantId,
      }).lean();

      if (!modiGroup) {
        throw new ErrorWithProps(
          "Invalid modifier group provided, please try again"
        );
      }

      return modiGroup;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getModifierGroups(ctx: Context) {
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

      // Fetch all the modifier groups for selected restaurant
      const modifierGroups = await ModifierGroupModel.find({
        restaurantId: ctx.restaurantId,
      }).lean();

      return modifierGroups;
    } catch (error) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }
}
