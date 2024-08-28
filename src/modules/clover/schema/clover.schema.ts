import { getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Integration } from "../../integration/schema/integration.schema";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";
import { User } from "../../user/schema/user.schema";

@ObjectType()
export class CloverCredential {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => Integration)
  @prop({ ref: "Integration" })
  integration: Ref<Integration>;

  @Field(() => String)
  @prop()
  merchantId: string;

  @Field(() => String)
  @prop()
  accessToken: string;

  @Field(() => Number)
  @prop()
  accessTokenExpiration: number;

  @Field(() => String)
  @prop()
  refreshToken: string;

  @Field(() => Number)
  @prop()
  refreshTokenExpiration: number;
}

export const CloverCredentialModel = getModelForClass(CloverCredential, {
  schemaOptions: { timestamps: true },
});
