import { Field, ID, InputType } from "type-graphql";
import { AddressInfoInput } from "../../../types/common.input";
import {
  BusinessTypeEnum,
  EstimatedRevenueEnum,
  StaffCountEnum,
} from "./business.enum";

@InputType()
export class BusinessDetailsInput {
  @Field(() => String, { nullable: true })
  businessName: string;

  @Field(() => BusinessTypeEnum, { nullable: true })
  businessType: BusinessTypeEnum;

  @Field(() => EstimatedRevenueEnum, { nullable: true })
  estimatedRevenue: EstimatedRevenueEnum;

  @Field(() => StaffCountEnum, { nullable: true })
  employeeSize: StaffCountEnum;

  @Field(() => String, { nullable: true })
  ein: string;

  @Field(() => AddressInfoInput, { nullable: true })
  address: AddressInfoInput;
}

@InputType()
export class UpdateBusinessDetailsInput {
  @Field(() => ID, { nullable: false })
  _id: string;

  @Field(() => EstimatedRevenueEnum, { nullable: true })
  estimatedRevenue: EstimatedRevenueEnum;

  @Field(() => StaffCountEnum, { nullable: true })
  employeeSize: StaffCountEnum;

  @Field(() => AddressInfoInput, { nullable: true })
  address: AddressInfoInput;
}
