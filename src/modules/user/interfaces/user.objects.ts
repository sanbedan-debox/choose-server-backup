import { ModelOptions, Ref, Severity, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { RestaurantStatus } from "../../restaurant/interfaces/restaurant.enums";
import { Restaurant } from "../../restaurant/schema/restaurant.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class RestaurantInfo {
  @Field(() => Restaurant, { nullable: false })
  @prop({ ref: "Restaurant" })
  _id: Ref<Restaurant>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => RestaurantStatus)
  @prop({ default: RestaurantStatus.active })
  status: RestaurantStatus;

  @Field(() => String, { nullable: true })
  @prop({ default: null })
  city: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class UserPermission {
  @Field(() => ID)
  @prop({})
  id: string;

  @Field(() => PermissionTypeEnum)
  @prop({})
  type: PermissionTypeEnum;

  @Field(() => Boolean, { nullable: false, defaultValue: false })
  @prop({ default: false })
  status: boolean;
}

@ObjectType()
export class AccountPreference {
  @Field(() => Boolean)
  @prop({ default: false })
  whatsApp: boolean;

  @Field(() => Boolean)
  @prop({ default: false })
  email: boolean;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class RejectRecord {
  @Field(() => Admin, { nullable: false })
  @prop({ ref: "Admin" })
  admin: Ref<Admin>;

  @Field(() => String)
  @prop()
  name: string;

  @Field(() => String)
  @prop()
  reason: string;

  @Field(() => Date)
  @prop()
  createdAt: Date;
}
