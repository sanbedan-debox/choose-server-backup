import axios from "axios";
import * as cloudinary from "cloudinary";
import { Workbook } from "exceljs";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import moment from "moment";
import path from "path";
import { getServerUrl } from "../../campaign/helper";
import { EmailCampaignStatusEnum } from "../../campaign/interface/campaign.enum";
import { EmailCampaignModel } from "../../campaign/schema/campaign.schema";
import { EmailBuilderTemplateModel } from "../../campaign/schema/email-template.schema";
import { sendCampaignMails } from "../../emailers/service";
import { CampaignsQueueData } from "../interface/campaign.types";

// Cloudinary Config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface IMailLog {
  to: string;
  status: "success" | "error";
  error: string | null;
  date: string;
}

export const campaignWorker = async (data: CampaignsQueueData) => {
  const { users, customLink, templateId, campaignId, emailSubject } = data;

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // Check if template present or not
    const template = await EmailBuilderTemplateModel.findOne({
      _id: templateId,
    }).select("_id templateFileName templateUrl");

    if (!template) {
      await EmailCampaignModel.updateOne(
        { _id: campaignId },
        {
          $set: {
            status: EmailCampaignStatusEnum.failed,
            errorMessage: "Email template not found",
          },
        }
      );
      return;
    }

    // Fetching Template file and saving in emails folder location
    const emailTempFileResp = await axios.get(template.templateUrl);

    const emailsDirLoc = path.join(__dirname, "../../../emails");
    if (!existsSync(emailsDirLoc)) {
      mkdirSync(emailsDirLoc);
    }
    const emailFilePath = `${emailsDirLoc}/${template.templateFileName}`;
    writeFileSync(emailFilePath, emailTempFileResp.data);

    // Sending mail and maintaining logs
    const mailLogs: IMailLog[] = [];
    let deliveryCount: number = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (
        user.email !== "" &&
        user.email !== null &&
        user.email !== undefined
      ) {
        let emailLink: string | null = null;
        if (customLink) {
          emailLink = `${customLink}/${user.email}`;
        }
        let trackerLink = `${getServerUrl()}/email-campaign/track/open/${campaignId}/${
          user.email
        }/image.png`;

        let sendMail = await sendCampaignMails(
          user.email,
          template.templateFileName.replace(".hbs", ""),
          user.name,
          emailSubject,
          emailLink,
          campaignId,
          trackerLink
        );

        if (sendMail.status === true) {
          deliveryCount++;
        } else {
          await EmailCampaignModel.updateOne(
            { _id: campaignId },
            {
              $set: {
                status: EmailCampaignStatusEnum.failed,
                errorMessage:
                  sendMail.error ??
                  "Something went wrong while sending an email",
              },
            }
          );
        }

        mailLogs.push({
          date: moment.utc().format(),
          status: sendMail.status ? "success" : "error",
          to: user.email,
          error: sendMail.error ?? "N/A",
        });

        await delay(2000);
      }
    }

    // Create an Excel workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("EmailCampaignLog");

    worksheet.addRow(["To", "Status", "Error", "Sent At"]);

    // Add email logs with errors to the worksheet
    mailLogs.forEach((log) => {
      worksheet.addRow([log.to, log.status, log.error, log.date]);
    });

    // save the xlms file in the folder
    const tempDirLoc = path.join(__dirname, "../../../temp");
    if (!existsSync(tempDirLoc)) {
      mkdirSync(tempDirLoc, { recursive: true });
    }

    const logFileName = `email_log_${campaignId}.xlsx`;
    const logsSavePath = `${tempDirLoc}/${logFileName}`;

    await workbook.xlsx.writeFile(logsSavePath);

    const cloudinaryApiReq = await cloudinary.v2.uploader.upload(logsSavePath, {
      public_id: logFileName,
      upload_preset: "email-campaigns",
      resource_type: "raw",
    });

    // Remove log file
    unlinkSync(logsSavePath);

    // Remove email template
    unlinkSync(emailFilePath);

    // Update the email campaign status with the successful count
    await EmailCampaignModel.findByIdAndUpdate(campaignId, {
      $set: {
        status: EmailCampaignStatusEnum.success,
        "stats.mailsSent": users.length,
        "stats.mailsDelivered": deliveryCount,
        logUrl: cloudinaryApiReq.secure_url,
      },
    });
  } catch (error: any) {
    await EmailCampaignModel.updateOne(
      { _id: campaignId },
      {
        $set: {
          status: EmailCampaignStatusEnum.failed,
          errorMessage: error.toString(),
        },
      }
    );
  }
};
