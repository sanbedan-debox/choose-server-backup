import { getModelForClass, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class Otp {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  otpHash: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  emailOrNumber: string;

  @Field(() => Date, { nullable: false })
  @prop({ required: true })
  expiresAt: Date;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const OtpModel = getModelForClass(Otp, {
  schemaOptions: { timestamps: true },
});
