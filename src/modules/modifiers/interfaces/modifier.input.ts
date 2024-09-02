import { Field, InputType } from "type-graphql";
import { PriceTypeEnum } from "./modifier.enum";

@InputType()
export class AddModifierInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;

  @Field(() => Number, { nullable: false })
  price: number;

  @Field(() => Boolean, { nullable: false })
  preSelect: boolean;

  @Field(() => Boolean, { nullable: false })
  isItem: boolean;
}

@InputType()
export class UpdateModifierInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  desc: string | null;

  @Field(() => Number, { nullable: true })
  price: number | null;

  @Field(() => Boolean, { nullable: true })
  preSelect: boolean | null;

  @Field(() => Boolean, { nullable: true })
  isItem: boolean | null;
}

@InputType()
export class UpdateBulkModifierInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => Number, { nullable: true })
  price: number | null;
}

@InputType()
export class AddModifierGroupInput {
  @Field(() => PriceTypeEnum, { nullable: false })
  pricingType: PriceTypeEnum;

  @Field(() => Number, { nullable: false })
  price: number;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;

  @Field(() => Boolean)
  optional: boolean;

  @Field(() => Boolean)
  multiSelect: boolean;

  @Field(() => Number, { nullable: false })
  maxSelections: number;

  @Field(() => Number, { nullable: false })
  minSelections: number;
}

@InputType()
export class UpdateModifierGroupInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => PriceTypeEnum, { nullable: false })
  pricingType: PriceTypeEnum;

  @Field(() => Number, { nullable: true })
  price: number;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;

  @Field(() => Boolean, { nullable: true })
  optional: boolean;

  @Field(() => Boolean, { nullable: true })
  multiSelect: boolean;

  @Field(() => Number, { nullable: false })
  maxSelections: number;

  @Field(() => Number, { nullable: false })
  minSelections: number;
}

@InputType()
export class UpdateBulkModifierGroupInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;
}
