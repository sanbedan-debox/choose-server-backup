import { Field, InputType } from "type-graphql";

@InputType()
export class AccountPreferenceInput {
  @Field(() => Boolean)
  whatsApp: boolean;

  @Field(() => Boolean)
  email: boolean;
}

@InputType()
export class UserSignupInput {
  @Field(() => String, { nullable: false })
  firstName: string;

  @Field(() => String, { nullable: false })
  lastName: string;

  @Field(() => String, { nullable: false })
  email: string;

  @Field(() => String, { nullable: false })
  phone: string;

  @Field(() => AccountPreferenceInput, {
    defaultValue: { whatsapp: false, email: false },
  })
  accountPreferences: AccountPreferenceInput;
}

@InputType()
export class UserSignupVerificationInput extends UserSignupInput {
  @Field(() => String, { nullable: false })
  otp: string;

  @Field(() => String, { nullable: false })
  otpId: string;
}

@InputType()
export class UserLoginVerificationInput {
  @Field(() => String, { nullable: false })
  emailOrNumber: string;

  @Field(() => String, { nullable: false })
  otp: string;

  @Field(() => String, { nullable: false })
  otpId: string;
}

@InputType()
export class RejectUserDetailsInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  content: string;
}

@InputType()
export class UserStatusChangeInput {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => Boolean, { nullable: false })
  block: boolean;
}

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  firstName: string;

  @Field(() => String, { nullable: true })
  lastName: string;

  @Field(() => String, { nullable: true })
  email: string;

  @Field(() => String, { nullable: true })
  phone: string;

  @Field(() => AccountPreferenceInput, {
    nullable: true,
  })
  accountPreferences: AccountPreferenceInput;
}
