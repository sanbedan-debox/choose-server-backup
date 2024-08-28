import { Field, InputType } from "type-graphql";

@InputType()
export class UploadCsvInput {
  @Field(() => String)
  menu: string;

  @Field(() => String)
  csvFile: string;
}

@InputType()
export class UploadCsvErrorInput {
  @Field(() => [String])
  issues: string[];

  @Field(() => String)
  errorFile: string;
}
