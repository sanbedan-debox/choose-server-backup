import { Field, InputType } from "type-graphql";

@InputType()
export class TaxRateInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Number, { nullable: false })
  salesTax: number;
}

@InputType()
export class UpdateTaxRateInput {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => Number, { nullable: true })
  salesTax: number;
}
