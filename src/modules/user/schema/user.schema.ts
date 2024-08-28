import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { AccessHistory } from "../../../types/common.object";
import { Admin } from "../../admin/schema/admin.schema";
import { Business } from "../../business/schema/business.schema";
import { UserRole, UserStatus } from "../interfaces/user.enum";
import {
  AccountPreference,
  RejectRecord,
  RestaurantInfo,
  UserPermission,
} from "../interfaces/user.objects";

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class User {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true, trim: true })
  firstName: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true, trim: true })
  lastName: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true, trim: true })
  email: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  phone: string;

  @Field(() => [AccessHistory], { nullable: true })
  @prop({ type: AccessHistory, default: [] })
  accessHistory: AccessHistory[];

  @Field(() => AccountPreference, { nullable: true })
  @prop({ default: null })
  accountPreferences: AccountPreference;

  @Field(() => UserStatus)
  @prop({ default: UserStatus.onboardingPending })
  status: UserStatus;

  @Field(() => Admin, { nullable: true })
  @prop({ ref: "Admin" })
  statusUpdatedBy: Ref<Admin>;

  @Field(() => Business, { nullable: true })
  @prop({ ref: "Business" })
  businessInfo: Ref<Business>;

  @Field(() => String, { nullable: true }) // gets updated only for sub users, stores the user id who added the team member
  @prop({ required: false })
  creatorUser: string;

  @Field(() => [UserPermission], { nullable: false, defaultValue: [] })
  @prop({ type: UserPermission, _id: false })
  permissions: UserPermission[];

  @Field(() => [RejectRecord], { nullable: true })
  @prop({ type: [RejectRecord], default: [] })
  verificationRejections: RejectRecord[];

  @Field(() => UserRole)
  @prop({ required: true })
  role: UserRole;

  @Field(() => Boolean, { defaultValue: false })
  @prop({ required: false, default: false })
  enable2FA: boolean;

  @Field(() => [RestaurantInfo], { nullable: true })
  @prop({ type: RestaurantInfo })
  restaurants: RestaurantInfo[];

  @prop({ default: 0 })
  authTokenVersion: number;

  @Field(() => User, { nullable: true, defaultValue: null })
  @prop({ ref: "User", default: null })
  updatedBy: Ref<User>;

  @Field(() => Date)
  @prop()
  lastLoggedIn: Date;

  @Field(() => Date)
  @prop()
  lastLoggedOut: Date;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
});
