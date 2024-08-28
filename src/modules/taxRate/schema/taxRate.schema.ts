import { getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
export class TaxRate {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => String, { nullable: false })
  @prop()
  name: string;

  @Field(() => Number, { nullable: false })
  @prop({})
  salesTax: number;

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

export const TaxRateModel = getModelForClass(TaxRate, {
  schemaOptions: { timestamps: true },
});
