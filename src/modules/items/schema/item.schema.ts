import {
  getModelForClass,
  ModelOptions,
  prop,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { StatusEnum } from "../../../types/common.enum";
import { Availability, Visibility } from "../../../types/common.object";
import { Category } from "../../categories/schema/category.schema";
import { ItemOptionsEnum } from "../../masters/interface/masters.enum";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { PriceTypeEnum } from "../../modifiers/interfaces/modifier.enum";
import { ModifierGroup } from "../../modifiers/schema/modifier.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ModifierGroupInfo {
  @Field(() => ModifierGroup)
  @prop({ ref: "ModifierGroup" })
  _id: Ref<ModifierGroup>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => PriceTypeEnum)
  @prop({ default: null })
  pricingType: PriceTypeEnum;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class PriceOptions {
  @Field(() => MenuTypeEnum, { nullable: false })
  @prop({ default: MenuTypeEnum.OnlineOrdering })
  menuType: MenuTypeEnum;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  price: number;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Options {
  @Field(() => ID, { nullable: false })
  _id: string;

  @Field(() => ItemOptionsEnum, { nullable: false })
  @prop({})
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  @prop({})
  displayName: string;

  @Field(() => String, { nullable: false })
  @prop({})
  desc: string;

  @Field(() => Boolean, { nullable: false, defaultValue: false })
  @prop({ default: false })
  status: boolean;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ItemSubCategory {
  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  desc: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Item {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  desc: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => [Category], { nullable: true, defaultValue: [] })
  @prop({ ref: "Category", default: [] })
  category: Ref<Category>[];

  @Field(() => StatusEnum)
  @prop({ default: null })
  status: StatusEnum;

  @Field(() => [ModifierGroupInfo]) // pending
  @prop({ type: ModifierGroupInfo, required: true })
  modifierGroup: ModifierGroupInfo[];

  @Field(() => String, { nullable: true })
  @prop({ required: false, default: null })
  image: string;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  price: number;

  @Field(() => [PriceOptions], { nullable: false })
  @prop({ type: PriceOptions })
  priceOptions: PriceOptions[];

  @Field(() => [Options], { nullable: false, defaultValue: [] })
  @prop({ type: Options })
  options: Options[];

  @Field(() => ItemSubCategory, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null, _id: false })
  subCategory: ItemSubCategory;

  @Field(() => Number, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  orderLimit: number;

  @Field(() => [Visibility], { nullable: false })
  @prop({ type: Visibility })
  visibility: Visibility[];

  @Field(() => [Availability], { nullable: true })
  @prop({ type: Availability })
  availability: Availability[];

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

export const ItemModel = getModelForClass(Item, {
  schemaOptions: { timestamps: true },
});
