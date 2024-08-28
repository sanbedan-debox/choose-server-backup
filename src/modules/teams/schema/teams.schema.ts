import {
  getModelForClass,
  ModelOptions,
  prop,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { UserStatus } from "../../user/interfaces/user.enum";
import {
  RestaurantInfo,
  UserPermission,
} from "../../user/interfaces/user.objects";
import { User } from "../../user/schema/user.schema";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class SubUser {
  @Field(() => User, { nullable: true }) // sub-user user id
  @prop({ ref: "User" })
  _id: Ref<User>;

  @Field(() => String)
  @prop({ required: true })
  firstName: string;

  @Field(() => String)
  @prop({ required: true })
  lastName: string;

  @Field(() => String)
  @prop({ required: true })
  email: string;

  @Field(() => String)
  @prop({ required: true })
  phone: string;

  @Field(() => String)
  @prop()
  role: string;

  @Field(() => UserStatus)
  @prop({ default: UserStatus.subUserEmailVerificationPending })
  status: UserStatus;

  @Field(() => [RestaurantInfo], { nullable: true })
  @prop({ type: RestaurantInfo })
  restaurants: RestaurantInfo[];

  @Field(() => [UserPermission], { nullable: false, defaultValue: [] })
  @prop({ type: UserPermission, _id: false })
  permissions: UserPermission[];

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Teams {
  @Field(() => User, { nullable: true }) // owner user id
  @prop({ ref: "User" })
  _id: Ref<User>;

  @Field(() => [SubUser])
  @prop({ type: SubUser })
  subUsers: SubUser[];
}

export const TeamsModel = getModelForClass(Teams, {
  schemaOptions: { timestamps: true },
});
