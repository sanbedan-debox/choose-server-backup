import { BeAnObject, DocumentType } from "@typegoose/typegoose/lib/types";
import { ErrorWithProps } from "mercurius";
import { FlattenMaps } from "mongoose";
import Context from "../../../types/context.type";
import { redisClient, RedisKeys } from "../../../utils/redis";
import { Admin } from "../../admin/schema/admin.schema";
import { UserRole } from "../../user/interfaces/user.enum";
import {
  ConfigTypeEnum,
  ItemOptionsEnum,
  PermissionTypeEnum,
} from "../interface/masters.enum";
import {
  AddConfigInput,
  AddCuisineInput,
  AddItemOptionInput,
  AddPermissionInput,
  AddStateInput,
  AddTimezoneInput,
  UpdateItemOptionInput,
} from "../interface/masters.input";
import {
  ConfigsModel,
  CuisinesModel,
  ItemOptionsModel,
  PermissionsModel,
  StatesModel,
  TimezonesModel,
} from "../schema/index.schema";
import { ItemOption } from "../schema/item_options.schema";
import { Permission } from "../schema/permissions.schema";

export class MastersService {
  private async revalidateMastersCache(key: string) {
    await redisClient.del(`${key}:keys`);
  }

  // STATES Start
  async addState(input: AddStateInput, ctx: Context) {
    try {
      const addResp = await StatesModel.create({
        value: input.value,
        abbreviation: input.abbreviation,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_STATES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updateStateStatus(id: string, ctx: Context) {
    try {
      const updateResp = await StatesModel.updateOne({ _id: id }, [
        { $set: { status: { $not: "$status" }, updatedBy: ctx.user } },
      ]);
      if (updateResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_STATES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllStates() {
    try {
      const arr = await StatesModel.find().lean();
      return arr;
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getActiveStates() {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_STATES_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await StatesModel.find({ status: true }).lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          value: item.value,
          abbreviation: item.abbreviation,
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData;
    } else {
      const list: {
        _id: string;
        value: string;
        abbreviation: string;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            value: itemData["value"],
            abbreviation: itemData["abbreviation"],
          });
        }
      }
      return list;
    }
  }
  // STATES End

  // CUISINES Start
  async addCuisine(input: AddCuisineInput, ctx: Context) {
    try {
      const addResp = await CuisinesModel.create({
        value: input.value,
        description: input.description,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_CUISINES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updateCuisineStatus(id: string, ctx: Context) {
    try {
      const updateResp = await CuisinesModel.updateOne({ _id: id }, [
        { $set: { status: { $not: "$status" }, updatedBy: ctx.user } },
      ]);
      if (updateResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_CUISINES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllCuisines() {
    try {
      const arr = await CuisinesModel.find().lean();
      return arr;
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getActiveCuisines() {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_CUISINES_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await CuisinesModel.find({ status: true }).lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          value: item.value,
          description: item.description,
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData;
    } else {
      const list: {
        _id: string;
        value: string;
        description: string;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            value: itemData["value"],
            description: itemData["description"],
          });
        }
      }
      return list;
    }
  }
  // CUISINES End

  // TIMEZONES Start
  async addTimezone(input: AddTimezoneInput, ctx: Context) {
    try {
      const addResp = await TimezonesModel.create({
        value: input.value,
        gmtOffset: input.gmtOffset,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_TIMEZONES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updateTimezoneStatus(id: string, ctx: Context) {
    try {
      const updateResp = await TimezonesModel.updateOne({ _id: id }, [
        { $set: { status: { $not: "$status" }, updatedBy: ctx.user } },
      ]);
      if (updateResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_TIMEZONES_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllTimezones() {
    try {
      const arr = await TimezonesModel.find().lean();
      return arr;
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getActiveTimezones() {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_TIMEZONES_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await TimezonesModel.find({ status: true }).lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          value: item.value,
          gmtOffset: item.gmtOffset.toString(),
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData;
    } else {
      const list: {
        _id: string;
        value: string;
        gmtOffset: number;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            value: itemData["value"],
            gmtOffset: parseInt(itemData["gmtOffset"]),
          });
        }
      }
      return list;
    }
  }
  // TIMEZONES End

  // PERMISSIONS Start
  async addPermission(input: AddPermissionInput, ctx: Context) {
    try {
      const checkPrev = await PermissionsModel.countDocuments({
        type: input.type,
      }).lean();
      if (checkPrev > 0) {
        throw new ErrorWithProps("Permission is already added for this type");
      }

      const addResp = await PermissionsModel.create({
        type: input.type,
        preselect: input.preselect,
        isFunction: input.isFunction,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_PERMISSIONS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updatePermissionPreselect(
    id: string,
    preselect: UserRole[],
    ctx: Context
  ) {
    try {
      const updResp = await PermissionsModel.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            preselect,
            updatedBy: ctx.user,
          },
        }
      );
      if (updResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_PERMISSIONS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllPermissions(): Promise<Permission[]> {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_PERMISSIONS_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await PermissionsModel.find()
        .populate([
          { path: "createdBy", select: "_id name" },
          { path: "updatedBy", select: "_id name" },
        ])
        .lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          type: item.type.toString(),
          preselect: item.preselect.toString(),
          isFunction: item.isFunction ? "yes" : "no",
          createdAt: item.createdAt.toUTCString(),
          updatedAt: item.updatedAt.toUTCString(),
          createdBy: JSON.stringify(item.createdBy),
          updatedBy: JSON.stringify(item.updatedBy),
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData.map((item) => ({
        _id: item._id,
        type: item.type,
        preselect: item.preselect,
        isFunction: item.isFunction,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy as FlattenMaps<
          DocumentType<Admin, BeAnObject>
        >,
        updatedBy: item.updatedBy as FlattenMaps<
          DocumentType<Admin, BeAnObject>
        >,
      }));
    } else {
      const list: {
        _id: string;
        type: PermissionTypeEnum;
        preselect: UserRole[];
        isFunction: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdBy: FlattenMaps<DocumentType<Admin, BeAnObject>>;
        updatedBy: FlattenMaps<DocumentType<Admin, BeAnObject>>;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            type: itemData["type"] as PermissionTypeEnum,
            preselect: itemData["preselect"].split(",") as UserRole[],
            isFunction: itemData["isFunction"] === "yes",
            createdAt: new Date(itemData["createdAt"]),
            updatedAt: new Date(itemData["updatedAt"]),
            createdBy: JSON.parse(itemData["createdBy"]) as FlattenMaps<
              DocumentType<Admin, BeAnObject>
            >,
            updatedBy: JSON.parse(itemData["updatedBy"]) as FlattenMaps<
              DocumentType<Admin, BeAnObject>
            >,
          });
        }
      }
      return list;
    }
  }
  async checkPermissionExist(
    id: string,
    type: PermissionTypeEnum
  ): Promise<boolean> {
    const cacheKey = RedisKeys.M_PERMISSIONS_KEY;

    const itemData = await redisClient.hgetall(`${cacheKey}:${id}`);

    // Check if cache present
    if (itemData) {
      const itemType = itemData["type"] as PermissionTypeEnum;
      if (itemType === type) {
        return true;
      } else {
        return false;
      }
    } else {
      const check = await PermissionsModel.countDocuments({ type: type });
      if (check > 0) {
        return true;
      }

      return false;
    }
  }
  // PERMISSIONS End

  // CONFIGS Start
  async addConfig(input: AddConfigInput, ctx: Context) {
    try {
      const checkPrev = await ConfigsModel.countDocuments({
        type: input.type,
      }).lean();
      if (checkPrev > 0) {
        throw new ErrorWithProps("Config is already added for this type");
      }

      const addResp = await ConfigsModel.create({
        type: input.type,
        value: input.value,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_CONFIGS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updateConfig(id: string, value: number, ctx: Context) {
    try {
      const updResp = await ConfigsModel.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            value,
            updatedBy: ctx.user,
          },
        }
      );
      if (updResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_CONFIGS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllConfigs() {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_CONFIGS_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await ConfigsModel.find()
        .populate([
          { path: "createdBy", select: "_id name" },
          { path: "updatedBy", select: "_id name" },
        ])
        .lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          type: item.type.toString(),
          value: item.value.toString(),
          createdAt: item.createdAt.toUTCString(),
          updatedAt: item.updatedAt.toUTCString(),
          createdBy: JSON.stringify(item.createdBy),
          updatedBy: JSON.stringify(item.updatedBy),
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData;
    } else {
      const list: {
        _id: string;
        type: ConfigTypeEnum;
        value: number;
        createdAt: Date;
        updatedAt: Date;
        createdBy: Admin;
        updatedBy: Admin;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            type: itemData["type"] as ConfigTypeEnum,
            value: parseInt(itemData["value"]),
            createdAt: new Date(itemData["createdAt"]),
            updatedAt: new Date(itemData["updatedAt"]),
            createdBy: JSON.parse(itemData["createdBy"]),
            updatedBy: JSON.parse(itemData["updatedBy"]),
          });
        }
      }
      return list;
    }
  }
  async getConfig(type: ConfigTypeEnum) {
    // Not using cache for this value
    const config = await ConfigsModel.findOne({ type: type }).lean();
    return config;
  }
  // CONFIGS End

  // ITEM OPTIONS Start
  async addItemOption(input: AddItemOptionInput, ctx: Context) {
    try {
      const checkPrev = await ItemOptionsModel.countDocuments({
        type: input.type,
      }).lean();
      if (checkPrev > 0) {
        throw new ErrorWithProps("Item Option is already added for this type");
      }

      const addResp = await ItemOptionsModel.create({
        type: input.type,
        displayName: input.displayName,
        desc: input.desc,
        createdBy: ctx.user,
        updatedBy: ctx.user,
      });
      if (addResp._id) {
        await this.revalidateMastersCache(RedisKeys.M_ITEM_OPTIONS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async updateItemOption(input: UpdateItemOptionInput, ctx: Context) {
    try {
      const updResp = await ItemOptionsModel.updateOne(
        {
          _id: input._id,
        },
        {
          $set: {
            displayName: input.displayName,
            desc: input.desc,
            updatedBy: ctx.user,
          },
        }
      );
      if (updResp.modifiedCount > 0) {
        await this.revalidateMastersCache(RedisKeys.M_ITEM_OPTIONS_KEY);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
  async getAllItemOptions(): Promise<ItemOption[]> {
    // Cache the data if not cached
    const cacheKey = RedisKeys.M_ITEM_OPTIONS_KEY;

    const itemKeys = await redisClient.smembers(`${cacheKey}:keys`);

    // Check if cache present
    if (itemKeys.length == 0) {
      const primaryData = await ItemOptionsModel.find()
        .populate([
          { path: "createdBy", select: "_id name" },
          { path: "updatedBy", select: "_id name" },
        ])
        .lean();
      for (const item of primaryData) {
        const itemKey = `${cacheKey}:${item._id}`;
        await redisClient.hmset(itemKey, {
          _id: item._id,
          type: item.type.toString(),
          displayName: item.displayName.toString(),
          desc: item.desc,
          createdAt: item.createdAt.toUTCString(),
          updatedAt: item.updatedAt.toUTCString(),
          createdBy: JSON.stringify(item.createdBy),
          updatedBy: JSON.stringify(item.updatedBy),
        });

        // Optionally, add the item key to a set for easy retrieval of all items
        await redisClient.sadd(`${cacheKey}:keys`, itemKey);
      }

      const ttl = 60 * 60 * 24 * 3; // 3 days in seconds
      await redisClient.expire(cacheKey, ttl);

      return primaryData.map((item) => ({
        _id: item._id,
        type: item.type,
        displayName: item.displayName,
        desc: item.desc,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy as FlattenMaps<
          DocumentType<Admin, BeAnObject>
        >,
        updatedBy: item.updatedBy as FlattenMaps<
          DocumentType<Admin, BeAnObject>
        >,
      }));
    } else {
      const list: {
        _id: string;
        type: ItemOptionsEnum;
        displayName: string;
        desc: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: FlattenMaps<DocumentType<Admin, BeAnObject>>;
        updatedBy: FlattenMaps<DocumentType<Admin, BeAnObject>>;
      }[] = [];
      for (const itemKey of itemKeys) {
        const itemData = await redisClient.hgetall(itemKey);
        if (itemData) {
          list.push({
            _id: itemKey.split(":")[1], // Extract ID from itemKey
            type: itemData["type"] as ItemOptionsEnum,
            displayName: itemData["displayName"],
            desc: itemData["desc"],
            createdAt: new Date(itemData["createdAt"]),
            updatedAt: new Date(itemData["updatedAt"]),
            createdBy: JSON.parse(itemData["createdBy"]) as FlattenMaps<
              DocumentType<Admin, BeAnObject>
            >,
            updatedBy: JSON.parse(itemData["updatedBy"]) as FlattenMaps<
              DocumentType<Admin, BeAnObject>
            >,
          });
        }
      }
      return list;
    }
  }
  async checkItemOptionExist(
    id: string,
    type: ItemOptionsEnum
  ): Promise<boolean> {
    const cacheKey = RedisKeys.M_ITEM_OPTIONS_KEY;

    const itemData = await redisClient.hgetall(`${cacheKey}:${id}`);

    // Check if cache present
    if (itemData) {
      const itemType = itemData["type"] as ItemOptionsEnum;
      if (itemType === type) {
        return true;
      } else {
        return false;
      }
    } else {
      const check = await ItemOptionsModel.countDocuments({ type: type });
      if (check > 0) {
        return true;
      }

      return false;
    }
  }
  // ITEM OPTIONS End
}
