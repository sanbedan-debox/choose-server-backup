import { Ref, index, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";

@ObjectType()
@index({ value: 1 })
export class State {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true, unique: true })
  value: string;

  @Field(() => Boolean, { nullable: false, defaultValue: true })
  @prop({ required: true, default: true })
  status: boolean;

  @Field(() => String, { nullable: true })
  @prop({ required: false, default: null })
  abbreviation: string;

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
