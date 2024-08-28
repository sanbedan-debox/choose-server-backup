import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class SubCategory {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: String;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  desc: String;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => User, { nullable: true, defaultValue: null })
  @prop({ ref: "User", default: null })
  updatedBy: Ref<User>;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const SubCategoryModel = getModelForClass(SubCategory, {
  schemaOptions: { timestamps: true },
});
