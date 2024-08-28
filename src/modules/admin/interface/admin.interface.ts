import { Field, InputType, registerEnumType } from "type-graphql";

export enum AdminRole {
  master = "master",
  admin = "admin",
  normal = "normal",
}

export enum AdminStatus {
  active = "active",
  blocked = "block",
}

registerEnumType(AdminRole, {
  name: "AdminRole",
  description: "Types of Admin Roles",
});

registerEnumType(AdminStatus, {
  name: "AdminStatus",
  description: "Types of status for Admin",
});

@InputType()
export class AddAdminInput {
  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: false })
  email: string;

  @Field(() => AdminRole)
  role: AdminRole;
}
