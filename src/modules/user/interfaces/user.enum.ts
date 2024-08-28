import { registerEnumType } from "type-graphql";

export enum UserStatus {
  active = "active",
  blocked = "block",
  paymentPending = "paymentPending",
  internalVerificationPending = "internalVerificationPending",
  onboardingPending = "onboardingPending",
  restaurantOnboardingPending = "restaurantOnboardingPending",
  subUserEmailVerificationPending = "subUserEmailVerificationPending",
}

export enum UserLoginType {
  Email = "Email",
  Phone = "Phone",
  Invalid = "Invalid",
}

export enum UserRole {
  Owner = "owner",
  Manager = "manager",
  Staff = "staff",
  MarketingPartner = "marketingPartner",
  Accountant = "accountant",
}

registerEnumType(UserRole, {
  name: "UserRole",
  description: "User roles ",
});

registerEnumType(UserStatus, {
  name: "UserStatus",
  description: "UserStatus type enum ",
});
