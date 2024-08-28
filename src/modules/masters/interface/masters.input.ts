import { Field, InputType } from "type-graphql";
import { UserRole } from "../../user/interfaces/user.enum";
import {
  ConfigTypeEnum,
  ItemOptionsEnum,
  PermissionTypeEnum,
} from "./masters.enum";

@InputType()
export class AddStateInput {
  @Field(() => String)
  value: string;

  @Field(() => String)
  abbreviation: string;
}

@InputType()
export class AddCuisineInput {
  @Field(() => String)
  value: string;

  @Field(() => String)
  description: string;
}

@InputType()
export class AddTimezoneInput {
  @Field(() => String)
  value: string;

  @Field(() => Number)
  gmtOffset: number;
}

@InputType()
export class AddPermissionInput {
  @Field(() => PermissionTypeEnum, { nullable: false })
  type: PermissionTypeEnum;

  @Field(() => Boolean, { nullable: false, defaultValue: false })
  isFunction: boolean;

  @Field(() => [UserRole], { nullable: false })
  preselect: UserRole[];
}

@InputType()
export class AddConfigInput {
  @Field(() => ConfigTypeEnum, { nullable: false })
  type: ConfigTypeEnum;

  @Field(() => Number, { nullable: false })
  value: number;
}

@InputType()
export class AddItemOptionInput {
  @Field(() => ItemOptionsEnum, { nullable: false })
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  displayName: string;

  @Field(() => String, { nullable: false })
  desc: string;
}

@InputType()
export class UpdateItemOptionInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => ItemOptionsEnum, { nullable: false })
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  displayName: string;

  @Field(() => String, { nullable: false })
  desc: string;
}
