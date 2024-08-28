import {
  getModelForClass,
  ModelOptions,
  prop,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import {
  AddressInfo,
  Availability,
  TaxRateInfo,
  TimezoneData,
} from "../../../types/common.object";
import { User } from "../../user/schema/user.schema";
import {
  BeverageCategory,
  FoodType,
  MeatType,
  RestaurantCategory,
  RestaurantStatus,
  RestaurantType,
} from "../interfaces/restaurant.enums";
import {
  IntegrationInfo,
  MenuInfo,
  SocialInfo,
} from "../interfaces/restaurant.object";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Restaurant {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => AddressInfo, { nullable: true })
  @prop({ required: true })
  address: AddressInfo;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  brandingLogo: string;

  @Field(() => SocialInfo, { nullable: true })
  @prop({ type: SocialInfo, default: null })
  socialInfo: SocialInfo;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  website: string;

  @Field(() => TimezoneData, { nullable: true })
  @prop({ type: TimezoneData })
  timezone: TimezoneData;

  @Field(() => [IntegrationInfo], { nullable: false, defaultValue: [] })
  @prop({ type: IntegrationInfo, default: [] })
  integrations: IntegrationInfo[];

  @Field(() => RestaurantStatus)
  @prop({ default: RestaurantStatus.onboardingPending })
  status: RestaurantStatus;

  @Field(() => [RestaurantCategory], { nullable: true })
  @prop({ default: [] })
  category: RestaurantCategory[];

  @Field(() => [BeverageCategory], { nullable: true })
  @prop({ default: [] })
  beverageCategory: BeverageCategory[];

  @Field(() => [FoodType], { nullable: true })
  @prop()
  foodType: FoodType[];

  @Field(() => MeatType, { nullable: true })
  @prop({})
  meatType: MeatType;

  @Field(() => RestaurantType, { nullable: true })
  @prop({})
  type: RestaurantType;

  @Field(() => Number, { nullable: true })
  @prop()
  dineInCapacity: number;

  @Field(() => [Availability], { nullable: true })
  @prop({ type: Availability, default: [] })
  availability: Availability[];

  @Field(() => [TaxRateInfo], { nullable: true })
  @prop({ type: TaxRateInfo, default: [] })
  taxRates: TaxRateInfo[];

  @Field(() => [MenuInfo], { nullable: true })
  @prop({ type: MenuInfo, default: [] })
  menus: MenuInfo[];

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

export const RestaurantModel = getModelForClass(Restaurant, {
  schemaOptions: { timestamps: true },
});
