import {
  ModelOptions,
  Ref,
  Severity,
  getModelForClass,
  index,
  prop,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType, registerEnumType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import {
  EmailCampaignScheduleTypes,
  EmailCampaignStatusEnum,
  EmailCampaignTargetTypes,
} from "../interface/campaign.enum";
import { EmailBuilderTemplate } from "./email-template.schema";

registerEnumType(EmailCampaignStatusEnum, {
  name: "EmailCampaignStatusEnum",
  description: "This enum stores the status of email campaign",
});

registerEnumType(EmailCampaignTargetTypes, {
  name: "EmailCampaignTargetTypes",
  description: "This enum stores the types of target for email campaigns",
});

registerEnumType(EmailCampaignScheduleTypes, {
  name: "EmailCampaignScheduleTypes",
  description: "This enum stores the types of schedule for email campaigns",
});

@ObjectType()
export class EmailCampaignEventHistory {
  @Field(() => String)
  @prop({ required: true })
  email: string;

  @Field(() => Date)
  @prop({ required: true })
  date: Date;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class EmailCampaignStats {
  @Field(() => Number)
  @prop({ default: 0 })
  mailsSent: number;

  @Field(() => Number)
  @prop({ default: 0 })
  mailsDelivered: number;

  @Field(() => [EmailCampaignEventHistory])
  @prop({ default: [], _id: false })
  mailsOpened: EmailCampaignEventHistory[];

  @Field(() => [EmailCampaignEventHistory])
  @prop({ default: [], _id: false })
  mailsClicked: EmailCampaignEventHistory[];
}

@ObjectType()
export class EmailCampaignFilters {
  @Field(() => String, { nullable: true })
  @prop({ default: null })
  location: string;

  @Field(() => String, { nullable: true })
  @prop({ default: null })
  industry: string;

  @Field(() => Number, { nullable: true })
  @prop({ default: null })
  minPay: number;

  @Field(() => Number, { nullable: true })
  @prop({ default: null })
  maxPay: number;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: null })
  employerAccountPending: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: null })
  employerEmailPending: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: null })
  activeEmployerNoJobs: boolean;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class EmailCampaign {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  campaignName: string;

  @Field(() => String)
  @prop({ required: true })
  emailSubject: string;

  @Field(() => EmailBuilderTemplate, { nullable: true })
  @prop({ ref: () => EmailBuilderTemplate })
  emailTemplate: Ref<EmailBuilderTemplate>;

  @Field(() => EmailCampaignStatusEnum)
  @prop({ default: EmailCampaignStatusEnum.processing })
  status: EmailCampaignStatusEnum;

  @Field(() => EmailCampaignTargetTypes)
  @prop({ required: true })
  target: EmailCampaignTargetTypes;

  @Field(() => EmailCampaignScheduleTypes)
  @prop({ default: EmailCampaignScheduleTypes.now })
  scheduleType: EmailCampaignScheduleTypes;

  @Field(() => Date, { nullable: true })
  @prop({ default: null })
  scheduleTime: Date;

  @Field(() => EmailCampaignStats)
  @prop({ _id: false })
  stats: EmailCampaignStats;

  @Field(() => EmailCampaignFilters)
  @prop({ _id: false })
  filters: EmailCampaignFilters;

  @Field(() => String, { nullable: true })
  @prop({ default: null })
  logUrl: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ default: null })
  csvDataUrl: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @prop({ default: null })
  errorMessage: string;

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

@ObjectType()
@index({ shortId: 1 })
export class EmailCampaignLink {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  actualLink: string;

  @Field(() => String)
  @prop({ required: true })
  shortLink: string;

  @Field(() => String)
  @prop({ required: true, unique: true })
  shortId: string;

  @Field(() => EmailCampaign) // Campaign Id Ref
  @prop({ ref: () => EmailCampaign })
  emailCampaign: Ref<EmailCampaign>;

  @Field(() => Date)
  @prop()
  createdAt: Date;

  @Field(() => Date)
  @prop()
  updatedAt: Date;
}

export const EmailCampaignModel = getModelForClass(EmailCampaign, {
  schemaOptions: { timestamps: true },
});

export const EmailCampaignLinkModel = getModelForClass(EmailCampaignLink, {
  schemaOptions: { timestamps: true },
});
