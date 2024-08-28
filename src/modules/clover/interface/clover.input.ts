import { Field, InputType } from "type-graphql";

@InputType()
export class CloverConnectionInput {
  @Field()
  authCode: string;

  @Field()
  merchantId: string;
}
