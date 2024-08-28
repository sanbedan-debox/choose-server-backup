import { Field, InputType } from "type-graphql";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { UserRole } from "../../user/interfaces/user.enum";
import { AccountPreferenceInput } from "../../user/interfaces/user.input";

@InputType()
export class UserPermissionInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => PermissionTypeEnum, { nullable: false })
  type: PermissionTypeEnum;

  @Field(() => Boolean, { nullable: false })
  status: boolean;
}

@InputType()
export class AddTeamMemberInput {
  @Field(() => String, { nullable: false })
  firstName: string;

  @Field(() => String, { nullable: false })
  lastName: string;

  @Field(() => String, { nullable: false })
  email: string;

  @Field(() => String, { nullable: false })
  phone: string;

  @Field(() => UserRole, { nullable: false })
  role: UserRole;

  @Field(() => AccountPreferenceInput, { nullable: false })
  accountPreferences: AccountPreferenceInput;

  @Field(() => [String], { nullable: false })
  restaurants: string[];

  @Field(() => [UserPermissionInput], { nullable: false })
  permissions: UserPermissionInput[];
}

@InputType()
export class UpdateSubuserRoleInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => UserRole, { nullable: true })
  role: UserRole;
}

@InputType()
export class UpdateSubuserPermissionsInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => [UserPermissionInput], { nullable: true })
  permissions: UserPermissionInput[];
}

@InputType()
export class RestaurantSubuserInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => [String], { nullable: true })
  restaurants: string[];
}
