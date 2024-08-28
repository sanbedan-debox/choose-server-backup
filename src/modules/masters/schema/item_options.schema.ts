import { ModelOptions, Ref, Severity, index, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import { ItemOptionsEnum } from "../interface/masters.enum";

@ObjectType()
@index({ type: 1 })
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class ItemOption {
  @Field(() => ID)
  _id: string;

  @Field(() => ItemOptionsEnum, { nullable: false })
  @prop({ required: true })
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  displayName: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  desc: string;

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
