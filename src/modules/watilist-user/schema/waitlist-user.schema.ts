import {
  ModelOptions,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { SoftWareEnum } from "../interface/waitlist-user.interface";

@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class WaitListUser {
  @Field(() => ID, { nullable: true })
  _id: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  name: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  email: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  website: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  restaurantName: string;

  @Field(() => SoftWareEnum)
  @prop({ required: true })
  software: SoftWareEnum;

  @Field(() => String)
  @prop({ required: true, trim: true })
  number: string;

  @Field(() => Date, { nullable: true })
  @prop()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  @prop()
  updatedAt: Date;
}

export const WaitListUserModel = getModelForClass(WaitListUser, {
  schemaOptions: { timestamps: true },
});
