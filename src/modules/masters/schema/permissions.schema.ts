import { ModelOptions, Ref, Severity, index, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import { UserRole } from "../../user/interfaces/user.enum";
import { PermissionTypeEnum } from "../interface/masters.enum";

@ObjectType()
@index({ type: 1 })
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Permission {
  @Field(() => ID)
  _id: string;

  @Field(() => PermissionTypeEnum, { nullable: false })
  @prop({ required: true })
  type: PermissionTypeEnum;

  @Field(() => Boolean, { nullable: false, defaultValue: false })
  @prop({ required: true, default: false })
  isFunction: boolean;

  @Field(() => [UserRole], { nullable: false, defaultValue: [] })
  @prop({ required: true, default: [] })
  preselect: UserRole[];

  @Field(() => Admin)
  @prop({ ref: () => Admin, required: true })
  createdBy: Ref<Admin>;

  @Field(() => Admin)
  @prop({ ref: () => Admin, required: true })
  updatedBy: Ref<Admin>;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}
