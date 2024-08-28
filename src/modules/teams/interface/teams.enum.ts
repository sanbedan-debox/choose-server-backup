import { registerEnumType } from "type-graphql";

export enum TeamsOnboardingEnum {
  verificationPending = "verificationPending",
  completed = "completed",
}

registerEnumType(TeamsOnboardingEnum, {
  name: "TeamsOnboardingEnum",
  description: "Team member onboarding status enum.",
});
