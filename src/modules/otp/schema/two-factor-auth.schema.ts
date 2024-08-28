import { getModelForClass, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class TwoFactorAuth {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  secret: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  user: string;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const TwoFactorAuthModel = getModelForClass(TwoFactorAuth, {
  schemaOptions: { timestamps: true },
});
