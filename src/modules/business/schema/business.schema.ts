import {
  getModelForClass,
  ModelOptions,
  prop,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { AddressInfo } from "../../../types/common.object";
import { UserStatus } from "../../user/interfaces/user.enum";
import { User } from "../../user/schema/user.schema";
import {
  BusinessTypeEnum,
  EstimatedRevenueEnum,
  StaffCountEnum,
} from "../interface/business.enum";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class UserInfo {
  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  _id: Ref<User>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String)
  @prop({ required: true })
  name: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true, trim: true })
  email: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  phone: string;

  @Field(() => UserStatus)
  @prop({ default: UserStatus.onboardingPending })
  status: UserStatus;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Business {
  @Field(() => ID)
  _id: string;

  @Field(() => UserInfo, { nullable: false })
  @prop({ type: UserInfo })
  user: UserInfo;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  businessName: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  ein: string;

  @Field(() => EstimatedRevenueEnum, { nullable: true })
  @prop({ required: false })
  estimatedRevenue: EstimatedRevenueEnum;

  @Field(() => StaffCountEnum, { nullable: true })
  @prop({ required: false })
  employeeSize: StaffCountEnum;

  @Field(() => BusinessTypeEnum, { nullable: true })
  @prop()
  businessType: BusinessTypeEnum;

  @Field(() => AddressInfo, { nullable: true })
  @prop({ required: false })
  address: AddressInfo;

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

export const BusinessModel = getModelForClass(Business, {
  schemaOptions: { timestamps: true },
});
