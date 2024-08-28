import { Field, InputType } from "type-graphql";
import { AvailabilityInput } from "../../../types/common.input";
import { MenuTypeEnum } from "./menu.enum";

@InputType()
export class AddMenuInput {
  @Field(() => MenuTypeEnum, { nullable: false })
  type: MenuTypeEnum;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: true })
  taxRateId: string;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];

  @Field(() => [String], { nullable: true })
  categories: string[];
}

@InputType()
export class UpdateMenuInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => MenuTypeEnum, { nullable: true })
  type: MenuTypeEnum;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];
}

@InputType()
export class UpdateBulkMenuInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;
}
