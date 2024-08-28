import axios from "axios";
import * as cloudinary from "cloudinary";
import { FastifyReply } from "fastify";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { ErrorWithProps } from "mercurius";
import moment from "moment";
import path from "path";
import Context from "../../../types/context.type";
import { AdminRole, AdminStatus } from "../../admin/interface/admin.interface";
import { AdminModel } from "../../admin/schema/admin.schema";
import { getServerUrl, validateEmail } from "../helper";
import { EmailCampaignTargetTypes } from "../interface/campaign.enum";
import {
  AddEmailCampaignInput,
  AddEmailTemplateInput,
  TestEmailInput,
} from "../interface/campaign.input";
import {
  EmailCampaignsObject,
  EmailTemplatesObject,
  TrackEmailOpenRequest,
  TrackLinkClickRequest,
} from "../interface/campaign.types";
import {
  EmailCampaignLinkModel,
  EmailCampaignModel,
} from "../schema/campaign.schema";
import { EmailBuilderTemplateModel } from "../schema/email-template.schema";
// import { addToEmailBuilderQueue } from "../../bull";
import { nanoid } from "nanoid";
import { PaginatedFilter } from "../../../types/common.input";
import { sendCampaignMails } from "../../emailers/service";
import { applyFilter } from "../../user/helper/user.helper";
import { UserStatus } from "../../user/interfaces/user.enum";
import { UserModel } from "../../user/schema/user.schema";
import { WaitListUserModel } from "../../watilist-user/schema/waitlist-user.schema";
import { CampaignQueue } from "../queue/index.queue";

// Cloudinary Config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CampaignService {
  private unknownIssue = "Something went wrong, please try again later!";
  private unauthorizeIssue = "You are not authorized to access this resource!";

  // Email template
  async createEmailTemplate(
    ctx: Context,
    input: AddEmailTemplateInput
  ): Promise<boolean> {
    try {
      if (ctx.role === undefined) {
        return false;
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        const admin = await AdminModel.findOne({ _id: ctx.user })
          .lean()
          .select("name email");
        if (!admin) {
          throw new ErrorWithProps(this.unauthorizeIssue);
        }
        const { title, designJson, content, html } = input;

        const isTitlePresent = await EmailBuilderTemplateModel.countDocuments({
          title,
        }).lean();
        if (isTitlePresent > 0) {
          throw new ErrorWithProps(
            `An email template with ${title} already exists`
          );
        }

        const tempDir = path.join(__dirname, "../../../temp");
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        const fileName = encodeURIComponent(
          `${admin.name}_${title}_${Date.now()}.hbs`
        );
        const savePath = `${tempDir}/${fileName}`;

        writeFileSync(savePath, html.toString() ?? "");

        const cloudinaryApiReq = await cloudinary.v2.uploader.upload(savePath, {
          public_id: fileName,
          upload_preset: "email-templates",
          resource_type: "raw",
        });

        await EmailBuilderTemplateModel.create({
          title: title.trim(),
          designJson: designJson,
          content: content,
          templateFileName: fileName,
          templateUrl: cloudinaryApiReq.secure_url,
          createdBy: ctx.user,
          updatedBy: ctx.user,
        });

        unlinkSync(savePath);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.log(error);
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getAllEmailTemplates(
    ctx: Context,
    filter: PaginatedFilter,
    page: number
  ): Promise<EmailTemplatesObject[]> {
    try {
      const rowCount = 7;
      if (ctx.role === undefined) {
        return [];
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        let matchingData: { [key: string]: any } = {};
        if (filter) {
          // filter field validation
          const schemaPath =
            EmailBuilderTemplateModel.schema.paths[filter.field];

          if (!schemaPath) {
            throw new Error(
              `Field '${filter.field}' does not exist in schema.`
            );
          }
          matchingData = applyFilter(filter);
        }

        const allTemplates = await EmailBuilderTemplateModel.find(matchingData)
          .populate([
            {
              path: "createdBy",
              strictPopulate: false,
              select: "name",
            },
            {
              path: "updatedBy",
              strictPopulate: false,
              select: "name",
            },
          ])
          .limit(rowCount)
          .skip((page ?? 0) * rowCount)
          .sort({ createdAt: -1 })
          .lean();

        let arr: EmailTemplatesObject[] = [];
        for (let i = 0; i < allTemplates.length; i++) {
          const template = allTemplates[i];
          arr.push({
            _id: template._id,
            title: template.title,
            content: template.content,
            designJson: template.designJson,
            createdBy: template.createdBy,
            updatedBy: template.updatedBy,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          });
        }
        return arr;
      } else {
        return [];
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }

  async deleteEmailTemplate(ctx: Context, id: string): Promise<boolean> {
    try {
      if (ctx.role === undefined) {
        throw new ErrorWithProps(this.unauthorizeIssue);
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        const campaignCount = await EmailCampaignModel.countDocuments({
          emailTemplate: id,
        }).lean();

        if (campaignCount > 0) {
          throw new ErrorWithProps(
            "Cannot be deleted since it's used in one of the campaign."
          );
        }

        const template = await EmailBuilderTemplateModel.findOne({ _id: id })
          .select("templateFileName")
          .lean();

        if (!template) {
          throw new ErrorWithProps(this.unknownIssue);
        }

        await cloudinary.v2.uploader.destroy(
          `marketing/email-templates/${template.templateFileName}`,
          {
            invalidate: true,
            resource_type: "raw",
          }
        );

        await EmailBuilderTemplateModel.deleteOne({ _id: id });

        return true;
      } else {
        throw new ErrorWithProps(this.unauthorizeIssue);
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async sendTestEmails(ctx: Context, input: TestEmailInput): Promise<boolean> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      if (ctx.role === undefined) {
        return false;
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        const admin = await AdminModel.findOne({ _id: ctx.user })
          .lean()
          .select("name email");
        if (!admin) {
          throw new ErrorWithProps(this.unauthorizeIssue);
        }

        const { emails, html, subject } = input;

        const emailsArr = emails.split(",");

        if (emailsArr.length > 5) {
          throw new ErrorWithProps(
            "You can only add upto 5 emails for sending a test email"
          );
        }

        emailsArr.map((e) => {
          if (!validateEmail(e)) {
            throw new ErrorWithProps(`${e} is not a valid email.`);
          }
        });

        const emailsDir = path.join(__dirname, "../../../emails");
        if (!existsSync(emailsDir)) {
          mkdirSync(emailsDir, { recursive: true });
        }

        const fileName = encodeURIComponent(
          `${admin.name}_${subject}_${Date.now()}.hbs`
        );
        const savePath = `${emailsDir}/${fileName}`;

        writeFileSync(savePath, html.toString() ?? "");

        for (let i = 0; i < emailsArr.length; i++) {
          const email = emailsArr[i];
          await sendCampaignMails(
            email.trim(),
            fileName.replace(".hbs", ""),
            "Test",
            subject,
            "",
            "",
            ""
          );
          await delay(1000); // 2 sec delay
        }
        unlinkSync(savePath);

        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  // Email Campaign
  async createEmailCampaign(
    ctx: Context,
    input: AddEmailCampaignInput
  ): Promise<boolean> {
    try {
      if (ctx.role === undefined) {
        return false;
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        let users: { _id: string; email: string; name: string }[] = [];
        if (
          input.target === EmailCampaignTargetTypes.CSV &&
          input.csvDataUrl !== null
        ) {
          const csvResp = await axios.get(input.csvDataUrl);
          const csvDataRows = csvResp?.data.split("\n");
          for (let i = 1; i < csvDataRows.length; i++) {
            const row = csvDataRows[i].split(",");

            users.push({
              _id: i.toString(),
              email: row[0].trim(),
              name: row[1].trim(),
            });
          }
        } else {
          users = await this.getUsersForTarget(ctx, input.target);
        }

        const campaign = await EmailCampaignModel.create({
          campaignName: input.campaignName,
          emailSubject: input.emailSubject,
          emailTemplate: input.emailTemplate,
          target: input.target,
          scheduleType: input.scheduleType,
          scheduleTime: input.scheduleTime,
          stats: {
            mailsSent: 0,
            mailsDelivered: 0,
            mailsOpened: [],
            mailsClicked: [],
          },
          createdBy: ctx.user,
          updatedBy: ctx.user,
          csvDataUrl: input.csvDataUrl,
        });

        let shortLink: string | null = null;

        if (input.customLink) {
          // const shortId =  nanoid(8);
          const shortId = nanoid(8);
          shortLink = `${getServerUrl()}/email-campaign/track/click/${shortId}`;
          await EmailCampaignLinkModel.create({
            shortLink: shortLink,
            shortId: shortId,
            emailCampaign: campaign._id,
            actualLink: input.customLink,
          });
        }

        await CampaignQueue.add({
          customLink: shortLink,
          scheduleTime: input.scheduleTime,
          templateId: input.emailTemplate,
          users,
          campaignId: campaign._id.toString(),
          emailSubject: input.emailSubject,
        });
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.log(error);
      return false;
      // throw new ApolloError(error.toString());
    }
  }

  async getUsersForTarget(
    ctx: Context,
    // input: EmailCampaignFiltersInput,
    target: EmailCampaignTargetTypes
  ): Promise<{ _id: string; email: string; name: string }[]> {
    try {
      if (ctx.role === undefined) {
        return [];
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        let users: { _id: string; email: string; name: string }[] = [];

        switch (target) {
          case EmailCampaignTargetTypes.Users:
            const restaurantUsersArr = await UserModel.find({
              status: UserStatus.active,
            })
              .select("_id firstName lastName email")
              .lean();
            users = restaurantUsersArr.map((el) => ({
              _id: el._id,
              name: `${el.firstName} ${el.lastName}`,
              email: el.email,
            }));
            break;

          case EmailCampaignTargetTypes.Waitlist:
            const waitlistUsersArr = await WaitListUserModel.find({})
              .select("_id name email")
              .lean();
            users = waitlistUsersArr.map((el) => ({
              _id: el._id,
              name: el.name,
              email: el.email,
            }));
            break;

          case EmailCampaignTargetTypes.Admins:
            const adminUsersArr = await AdminModel.find({
              status: AdminStatus.active,
              _id: { $ne: ctx.user },
            })
              .select("_id name email")
              .lean();
            users = adminUsersArr.map((el) => ({
              _id: el._id,
              name: el.name,
              email: el.email,
            }));
            break;

          default:
            break;
        }

        return users;
      } else {
        return [];
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async getAllEmailCampaigns(ctx: Context): Promise<EmailCampaignsObject[]> {
    try {
      if (ctx.role === undefined) {
        return [];
      }

      if (ctx.role === AdminRole.master || ctx.role === AdminRole.admin) {
        const allCampaigns = await EmailCampaignModel.find({})
          .populate([
            {
              path: "emailTemplate",
              strictPopulate: false,
              select: "title",
            },
            {
              path: "createdBy",
              strictPopulate: false,
              select: "name",
            },
            {
              path: "updatedBy",
              strictPopulate: false,
              select: "name",
            },
          ])
          .lean();

        let arr: EmailCampaignsObject[] = [];
        for (let i = 0; i < allCampaigns.length; i++) {
          const campaign = allCampaigns[i];
          const usersArr = await this.getUsersForTarget(ctx, campaign.target);
          arr.push({
            _id: campaign._id,
            campaignName: campaign.campaignName,
            emailSubject: campaign.emailSubject,
            emailTemplate: campaign.emailTemplate,
            status: campaign.status,
            target: campaign.target,
            scheduleType: campaign.scheduleType,
            usersCount: usersArr.length,
            scheduleTime: campaign.scheduleTime,
            stats: campaign.stats,
            logUrl: campaign.logUrl,
            csvDataUrl: campaign.csvDataUrl,
            createdBy: campaign.createdBy,
            updatedBy: campaign.updatedBy,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
          });
        }
        return arr;
      } else {
        return [];
      }
    } catch (error: any) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async trackLinkClick(req: TrackLinkClickRequest, res: FastifyReply) {
    try {
      const { shortId, email } = req.params;
      if (!shortId || !email) {
        res.redirect(process.env.APP_URL ?? "");
        return;
      }

      const emailLink = await EmailCampaignLinkModel.findOne({
        shortId,
      })
        .select("actualLink emailCampaign")
        .lean();
      if (!emailLink) {
        res.redirect(process.env.APP_URL ?? "");
        return;
      }
      await EmailCampaignModel.updateOne(
        { _id: emailLink.emailCampaign },
        {
          $push: {
            "stats.mailsClicked": {
              email: email,
              date: moment.utc().toDate(),
            },
          },
        }
      );
      res.redirect(emailLink.actualLink);
    } catch (error: any) {
      res.redirect(process.env.APP_URL ?? "");
      return;
    }
  }

  async trackEmailOpen(req: TrackEmailOpenRequest, res: FastifyReply) {
    const base64String =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC";
    const img = Buffer.from(base64String, "base64");

    try {
      const { campaignId, email } = req.params;

      if (campaignId && email) {
        await EmailCampaignModel.updateOne(
          { _id: campaignId },
          {
            $push: {
              "stats.mailsOpened": {
                email: email,
                date: moment.utc().toDate(),
              },
            },
          }
        );
      }
    } catch (error: any) {
      console.log(`Error in Tracking Email Opens ${error.toString()}`);
    }

    res
      .status(200)
      .header("Content-Type", "image/png")
      .header("Content-Length", img.length.toString())
      .send(img);
  }
}

export default CampaignService;
