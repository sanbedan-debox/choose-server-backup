import { ModelOptions, Ref, Severity, index, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import { ConfigTypeEnum } from "../interface/masters.enum";

@ObjectType()
@index({ type: 1 })
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Config {
  @Field(() => ID)
  _id: string;

  @Field(() => ConfigTypeEnum, { nullable: false })
  @prop({ required: true })
  type: ConfigTypeEnum;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  value: number;

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
