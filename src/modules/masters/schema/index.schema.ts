import { getModelForClass } from "@typegoose/typegoose";
import { Config } from "./configs.schema";
import { Cuisine } from "./cuisines.schema";
import { ItemOption } from "./item_options.schema";
import { Permission } from "./permissions.schema";
import { State } from "./states.schema";
import { Timezone } from "./timezones.schema";

export const StatesModel = getModelForClass(State, {
  schemaOptions: { timestamps: true },
});

export const CuisinesModel = getModelForClass(Cuisine, {
  schemaOptions: { timestamps: true },
});

export const TimezonesModel = getModelForClass(Timezone, {
  schemaOptions: { timestamps: true },
});

export const PermissionsModel = getModelForClass(Permission, {
  schemaOptions: { timestamps: true },
});

export const ConfigsModel = getModelForClass(Config, {
  schemaOptions: { timestamps: true },
});

export const ItemOptionsModel = getModelForClass(ItemOption, {
  schemaOptions: { timestamps: true },
});
