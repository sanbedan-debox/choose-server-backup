import { Field, InputType } from "type-graphql";
import { StatusEnum } from "../../../types/common.enum";
import {
  AvailabilityInput,
  VisibilityInput,
} from "../../../types/common.input";

@InputType()
export class AddCategoryInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: false })
  desc: string;

  @Field(() => StatusEnum, { nullable: false })
  status: StatusEnum;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];

  @Field(() => [String], { nullable: true })
  items: string[];

  @Field(() => [VisibilityInput], { nullable: true })
  visibility: VisibilityInput[];
}

@InputType()
export class UpdateCategoryInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;

  @Field(() => StatusEnum, { nullable: true })
  status: StatusEnum;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];

  @Field(() => [VisibilityInput], { nullable: true })
  visibility: VisibilityInput[];
}

@InputType()
export class UpdateBulkCategoryInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => StatusEnum, { nullable: true })
  status: StatusEnum;
}
