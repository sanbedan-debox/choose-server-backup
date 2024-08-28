import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isAdmin } from "../../../middlewares/authorisation";
import { PaginatedFilter } from "../../../types/common.input";
import Context from "../../../types/context.type";
import { EmailCampaignTargetTypes } from "../interface/campaign.enum";
import {
  AddEmailCampaignInput,
  AddEmailTemplateInput,
  TestEmailInput,
} from "../interface/campaign.input";
import {
  EmailCampaignsObject,
  EmailTemplatesObject,
} from "../interface/campaign.types";
import CampaignService from "../service/campaign.service";

@Resolver()
export class CampaignResolver {
  constructor(private service: CampaignService) {
    this.service = new CampaignService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  createEmailTemplate(
    @Arg("input") input: AddEmailTemplateInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return this.service.createEmailTemplate(context, input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  deleteEmailTemplate(
    @Arg("id") id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    return this.service.deleteEmailTemplate(context, id);
  }

  @Query(() => [EmailTemplatesObject])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllEmailTemplates(
    @Ctx() context: Context,
    @Arg("filter", { defaultValue: null, nullable: true })
    filter: PaginatedFilter,
    @Arg("page", { defaultValue: 0 }) page: number
  ): Promise<EmailTemplatesObject[]> {
    return this.service.getAllEmailTemplates(context, filter, page);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  sendTestEmails(
    @Arg("input") input: TestEmailInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return this.service.sendTestEmails(context, input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isAdmin])
  createEmailCampaign(
    @Arg("input") input: AddEmailCampaignInput,
    @Ctx() context: Context
  ): Promise<boolean> {
    return this.service.createEmailCampaign(context, input);
  }

  @Query(() => [EmailCampaignsObject])
  @UseMiddleware([isAuthenticated, isAdmin])
  getAllEmailCampaigns(
    @Ctx() context: Context
  ): Promise<EmailCampaignsObject[]> {
    return this.service.getAllEmailCampaigns(context);
  }

  @Query(() => Number)
  @UseMiddleware([isAuthenticated, isAdmin])
  async getUsersForTarget(
    @Arg("target", () => EmailCampaignTargetTypes)
    target: EmailCampaignTargetTypes,
    @Ctx() context: Context
  ): Promise<number> {
    const users = await this.service.getUsersForTarget(context, target);
    return users.length;
  }
}
