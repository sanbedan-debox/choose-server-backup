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
import { Availability, TaxRateInfo } from "../../../types/common.object";
import { Category } from "../../categories/schema/category.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";
import { MenuTypeEnum } from "../interfaces/menu.enum";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class CategoryInfo {
  @Field(() => Category)
  @prop({ ref: "Category" })
  _id: Ref<Category>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String, { nullable: true })
  @prop()
  name: string;

  @Field(() => StatusEnum)
  @prop({ default: null })
  status: StatusEnum;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Menu {
  @Field(() => ID)
  _id: string;

  @Field(() => MenuTypeEnum, { nullable: false })
  @prop({})
  type: MenuTypeEnum;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant, { nullable: false })
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => StatusEnum)
  @prop({ default: StatusEnum.inactive })
  status: StatusEnum;

  @Field(() => TaxRateInfo, { nullable: true, defaultValue: null })
  @prop({ type: TaxRateInfo, default: null })
  taxes: TaxRateInfo;

  @Field(() => [CategoryInfo]) // pending
  @prop({ type: CategoryInfo, required: true })
  categories: CategoryInfo[];

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

export const MenuModel = getModelForClass(Menu, {
  schemaOptions: { timestamps: true },
});
