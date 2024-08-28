import { Ref } from "@typegoose/typegoose";
import { FastifyRequest } from "fastify";
import { Field, ID, ObjectType } from "type-graphql";
import { Admin } from "../../admin/schema/admin.schema";
import { EmailCampaignStats } from "../schema/campaign.schema";
import { EmailBuilderTemplate } from "../schema/email-template.schema";
import {
  EmailCampaignScheduleTypes,
  EmailCampaignStatusEnum,
  EmailCampaignTargetTypes,
} from "./campaign.enum";

@ObjectType()
export class EmailTemplatesObject {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  designJson: string;

  @Field(() => Admin)
  createdBy: Ref<Admin>;

  @Field(() => Admin)
  updatedBy: Ref<Admin>;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class EmailCampaignsObject {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  campaignName: string;

  @Field(() => String)
  emailSubject: string;

  @Field(() => EmailBuilderTemplate)
  emailTemplate: Ref<EmailBuilderTemplate>;

  @Field(() => EmailCampaignStatusEnum)
  status: EmailCampaignStatusEnum;

  @Field(() => EmailCampaignTargetTypes)
  target: EmailCampaignTargetTypes;

  @Field(() => EmailCampaignScheduleTypes)
  scheduleType: EmailCampaignScheduleTypes;

  @Field(() => Date, { nullable: true })
  scheduleTime: Date;

  @Field(() => EmailCampaignStats)
  stats: EmailCampaignStats;

  @Field(() => Number)
  usersCount: number;

  @Field(() => String, { nullable: true })
  logUrl: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  csvDataUrl: string;

  @Field(() => Admin)
  createdBy: Ref<Admin>;

  @Field(() => Admin)
  updatedBy: Ref<Admin>;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export interface TrackLinkClickParams {
  shortId: string;
  email: string;
}

export interface TrackEmailOpenParams {
  campaignId: string;
  email: string;
}

export interface TrackLinkClickRequest extends FastifyRequest {
  params: TrackLinkClickParams;
}

export interface TrackEmailOpenRequest extends FastifyRequest {
  params: TrackEmailOpenParams;
}

export interface CampaignsQueueData {
  users: { email: string; name: string; _id: string }[];
  customLink: string | null;
  templateId: string;
  scheduleTime: Date | null;
  campaignId: string;
  emailSubject: string;
}
