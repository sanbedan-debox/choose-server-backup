import { Field, InputType } from "type-graphql";

@InputType()
export class AddSubCategoryInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;
}

@InputType()
export class UpdateSubCategoryInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;
}

@InputType()
export class UpdateBulkSubCategoryInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  desc: string;
}
