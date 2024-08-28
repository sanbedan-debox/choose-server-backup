import { Field, InputType, registerEnumType } from "type-graphql";

export enum SoftWareEnum {
  Clover = "Clover",
  Square = "Square",
  Toast = "Toast",
  Owner = "Owner",
  None = "None",
}

registerEnumType(SoftWareEnum, {
  name: "SoftWareEnum",
  description: "Types of SoftWare Enum",
});

@InputType()
export class AddWaitListUserInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  restaurantName: string;

  @Field(() => String)
  website: string;

  @Field(() => SoftWareEnum)
  software: SoftWareEnum;

  @Field(() => String)
  number: string;
}
