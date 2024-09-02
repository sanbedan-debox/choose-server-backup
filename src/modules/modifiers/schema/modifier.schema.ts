import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Item } from "../../items/schema/item.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";
import { PriceTypeEnum } from "../interfaces/modifier.enum";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ModifierInfo {
  @Field(() => Modifier)
  @prop({ ref: "Modifier" })
  _id: Ref<Modifier>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  desc: string;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  price: number;

  @Field(() => Boolean, { nullable: false })
  @prop({ default: false })
  preSelect: boolean;

  @Field(() => Boolean, { nullable: false })
  @prop({ default: false })
  isItem: boolean;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Modifier {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant, { nullable: false })
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => [ModifierGroup], { nullable: true, defaultValue: [] })
  @prop({ ref: "Item", default: [] })
  modifierGroup: Ref<ModifierGroup>[];

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  desc: string;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  price: number;

  @Field(() => Boolean, { nullable: false })
  @prop({ default: false })
  isItem: boolean;

  @Field(() => Boolean, { nullable: false })
  @prop({ default: false })
  preSelect: boolean;

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

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ModifierGroup {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant, { nullable: false })
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => [Item], { nullable: true, defaultValue: [] })
  @prop({ ref: "Item", default: [] })
  item: Ref<Item>[];

  @Field(() => PriceTypeEnum)
  @prop({ default: PriceTypeEnum.IndividualPrice })
  pricingType: PriceTypeEnum;

  @Field(() => Number, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  price: number;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ required: false, default: null })
  desc: string;

  @Field(() => Boolean)
  @prop({ default: true })
  optional: boolean;

  @Field(() => Boolean)
  @prop({ default: false })
  multiSelect: boolean;

  @Field(() => [ModifierInfo])
  @prop({ type: ModifierInfo, required: true })
  modifiers: ModifierInfo[];

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  minSelections: number;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  maxSelections: number;

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

export const ModifierGroupModel = getModelForClass(ModifierGroup, {
  schemaOptions: { timestamps: true },
});

export const ModifierModel = getModelForClass(Modifier, {
  schemaOptions: { timestamps: true },
});
