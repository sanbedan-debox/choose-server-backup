import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { AccessHistory } from "../../../types/common.object";
import { AdminRole, AdminStatus } from "../interface/admin.interface";

@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class Admin {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  name: string;

  @Field(() => String)
  @prop({ required: true, trim: true })
  email: string;

  @Field(() => AdminRole)
  @prop({ required: true })
  role: AdminRole;

  @Field(() => AdminStatus)
  @prop({ default: AdminStatus.active })
  status: AdminStatus;

  @Field(() => Admin)
  @prop({ ref: () => Admin, nullable: true, default: null })
  blockedBy: Ref<Admin>;

  @Field(() => Admin)
  @prop({ ref: () => Admin, nullable: true, default: null })
  unBlockedBy: Ref<Admin>;

  @Field(() => [AccessHistory], { nullable: true })
  @prop({ type: AccessHistory, default: [] })
  accessHistory: AccessHistory[];

  @prop({ default: 0 })
  authTokenVersion: number;

  @Field(() => Admin)
  @prop({ ref: () => Admin, nullable: true, default: null })
  createdBy: Ref<Admin>;

  @Field(() => Admin)
  @prop({ ref: () => Admin, nullable: true, default: null })
  updatedBy: Ref<Admin>;

  @Field(() => Date, { nullable: true })
  @prop({ default: null })
  lastLoggedIn: Date;

  @Field(() => Date, { nullable: true })
  @prop({ default: null })
  lastLoggedOut: Date;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}
export const AdminModel = getModelForClass(Admin, {
  schemaOptions: { timestamps: true },
});
