import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";

@ObjectType()
export class EmailTemplateVariables {
  @Field(() => String)
  @prop()
  key: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class EmailBuilderTemplate {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  title: string;

  @Field(() => String, {
    nullable: true,
  })
  @prop()
  content: string;

  @Field(() => String, {
    nullable: true,
  })
  @prop()
  designJson: string;

  @Field(() => String)
  @prop()
  templateFileName: string;

  @Field(() => String)
  @prop()
  templateUrl: string;

  @Field(() => Admin)
  @prop({ ref: () => Admin, required: true })
  createdBy: Ref<Admin>;

  @Field(() => Admin)
  @prop({ ref: () => Admin, required: true })
  updatedBy: Ref<Admin>;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const EmailBuilderTemplateModel = getModelForClass<
  typeof EmailBuilderTemplate
>(EmailBuilderTemplate, {
  schemaOptions: { timestamps: true },
});
