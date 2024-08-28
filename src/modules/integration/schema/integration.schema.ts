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
import {
  IntegrationConnectionStatusEnum,
  IntegrationPlatformEnum,
} from "../interfaces/integration.enum";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Integration {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { nullable: false })
  @prop({ ref: "User" })
  user: Ref<User>;

  @Field(() => Restaurant)
  @prop({ ref: "Restaurant" })
  restaurantId: Ref<Restaurant>;

  @Field(() => IntegrationPlatformEnum, { nullable: false })
  @prop()
  platform: IntegrationPlatformEnum;

  @Field(() => IntegrationConnectionStatusEnum, { nullable: false })
  @prop({ default: IntegrationConnectionStatusEnum.NotConnected })
  connectionStatus: IntegrationConnectionStatusEnum;

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

export const IntegrationModel = getModelForClass(Integration, {
  schemaOptions: { timestamps: true },
});
