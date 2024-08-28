import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import mongoose from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { StatusEnum } from "../../../types/common.enum";
import { Availability, Visibility } from "../../../types/common.object";
import { Item } from "../../items/schema/item.schema";
import { Menu } from "../../menu/schema/menu.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ItemInfo {
  @Field(() => Item)
  @prop({ ref: "Item" })
  _id: Ref<Item>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String, { nullable: true })
  @prop()
  name: string;

  @Field(() => Number)
  @prop()
  price: number;

  @Field(() => StatusEnum)
  @prop({ default: null })
  status: StatusEnum;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  image: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Category {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  desc: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => [Menu], { nullable: true, defaultValue: [] })
  @prop({ ref: "Menu", default: [] })
  menu: Ref<Menu>[];

  @Field(() => StatusEnum)
  @prop({ default: StatusEnum.inactive })
  status: StatusEnum;

  @Field(() => [ItemInfo])
  @prop({ type: ItemInfo, required: true })
  items: ItemInfo[];

  @Field(() => [Category], { nullable: true })
  @prop({ ref: "Category" })
  upSellCategories: mongoose.Types.Array<Category>;

  @Field(() => [Visibility], { nullable: false })
  @prop({ type: Visibility })
  visibility: Visibility[];

  @Field(() => [Availability], { nullable: true })
  @prop({ type: Availability })
  availability: mongoose.Types.Array<Availability>;

  @Field(() => User, { nullable: true, defaultValue: null })
  @prop({ ref: "User", default: null })
  updatedBy: Ref<User>;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const CategoryModel = getModelForClass(Category, {
  schemaOptions: { timestamps: true },
});
