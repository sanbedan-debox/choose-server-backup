import { Field, InputType } from "type-graphql";
import {
  EmailCampaignScheduleTypes,
  EmailCampaignTargetTypes,
} from "./campaign.enum";

@InputType()
export class AddEmailTemplateInput {
  @Field(() => String)
  title: string;

  @Field(() => String)
  designJson: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  html: string;
}

@InputType()
export class AddEmailCampaignInput {
  @Field(() => String, { nullable: false })
  campaignName: string;

  @Field(() => String, { nullable: false })
  emailSubject: string;

  @Field(() => String, { nullable: false })
  emailTemplate: string;

  @Field(() => EmailCampaignTargetTypes, { nullable: false })
  target: EmailCampaignTargetTypes;

  @Field(() => EmailCampaignScheduleTypes, { nullable: false })
  scheduleType: EmailCampaignScheduleTypes;

  @Field(() => Date, { nullable: true })
  scheduleTime: Date;

  // @Field(() => EmailCampaignFiltersInput)
  // filters: EmailCampaignFiltersInput;

  @Field(() => String, { nullable: true, defaultValue: null })
  csvDataUrl: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  customLink: string;
}

@InputType()
export class TestEmailInput {
  @Field(() => String)
  emails: string;

  @Field(() => String)
  html: string;

  @Field(() => String)
  subject: string;
}
