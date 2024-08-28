import {
  getModelForClass,
  index,
  ModelOptions,
  prop,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Menu } from "../../menu/schema/menu.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
@index({ user: 1, restaurantId: 1 })
export class CsvUpload {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => Menu)
  @prop({ ref: "Menu" })
  menu: Ref<Menu>;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  csvFile: string;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
@index({ user: 1, restaurantId: 1 })
export class CsvUploadError {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => [String], { defaultValue: [] })
  @prop({ default: [] })
  issues: string[];

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  errorFile: string;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const CsvUploadModel = getModelForClass(CsvUpload, {
  schemaOptions: { timestamps: true },
});

export const CsvUploadErrorModel = getModelForClass(CsvUploadError, {
  schemaOptions: { timestamps: true },
});
