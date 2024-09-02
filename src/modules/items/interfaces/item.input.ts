import { Field, InputType } from "type-graphql";
import { StatusEnum } from "../../../types/common.enum";
import {
  AvailabilityInput,
  PriceOptionsInput,
  VisibilityInput,
} from "../../../types/common.input";
import { ItemOptionsEnum } from "../../masters/interface/masters.enum";

@InputType()
export class OptionsInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => ItemOptionsEnum, { nullable: false })
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  displayName: string;

  @Field(() => String, { nullable: false })
  desc: string;

  @Field(() => Boolean, { nullable: false })
  status: boolean;
}

@InputType()
export class ItemSubCategoryInput {
  @Field(() => String, { nullable: true })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;
}

@InputType()
export class AddItemInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: false })
  desc: string;

  @Field(() => String, { nullable: true })
  image: string;

  @Field(() => Number, { nullable: false })
  price: number;

  @Field(() => StatusEnum, { nullable: false })
  status: StatusEnum;

  @Field(() => [OptionsInput], { nullable: false, defaultValue: [] })
  options: OptionsInput[];

  @Field(() => ItemSubCategoryInput, { nullable: true, defaultValue: null })
  subCategory: ItemSubCategoryInput;

  @Field(() => Number, { nullable: true, defaultValue: null })
  orderLimit: number;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];

  @Field(() => [VisibilityInput], { nullable: true })
  visibility: VisibilityInput[];

  @Field(() => [PriceOptionsInput], { nullable: false })
  priceOptions: PriceOptionsInput[];
}

@InputType()
export class UpdateItemInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;

  @Field(() => String, { nullable: true })
  image: string;

  @Field(() => Number, { nullable: true })
  price: number;

  @Field(() => StatusEnum, { nullable: true })
  status: StatusEnum;

  @Field(() => [OptionsInput], { nullable: false, defaultValue: [] })
  options: OptionsInput[];

  @Field(() => ItemSubCategoryInput, { nullable: true, defaultValue: null })
  subCategory: ItemSubCategoryInput;

  @Field(() => Number, { nullable: true, defaultValue: null })
  orderLimit: number;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];

  @Field(() => [VisibilityInput], { nullable: true })
  visibility: VisibilityInput[];

  @Field(() => [PriceOptionsInput], { nullable: true })
  priceOptions: PriceOptionsInput[];
}

@InputType()
export class UpdateBulkItemInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => StatusEnum, { nullable: true })
  status: StatusEnum;
}
