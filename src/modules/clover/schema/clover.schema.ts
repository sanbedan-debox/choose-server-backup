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

  @prop({ default: null })
  repeatJobKey: string;

  @Field(() => String)
  @prop()
  merchantId: string;

  @prop()
  accessToken: string;

  @prop()
  accessTokenExpiration: number;

  @prop()
  refreshToken: string;

  @prop()
  refreshTokenExpiration: number;

  @Field(() => Date)
  @prop()
  createdAt: Date;
}

export const CloverCredentialModel = getModelForClass(CloverCredential, {
  schemaOptions: { timestamps: true },
});
