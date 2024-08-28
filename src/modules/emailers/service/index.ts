import { ErrorWithProps } from "mercurius";
import nodemailer, { SendMailOptions } from "nodemailer";
import hbs, {
  HbsTransporter,
  NodemailerExpressHandlebarsOptions,
  TemplateOptions,
} from "nodemailer-express-handlebars";
import path from "path";

const transporter: HbsTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: process.env.SMTP_SECURE === "yes" ? true : false,
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

const hbsOptions: NodemailerExpressHandlebarsOptions = {
  extName: ".hbs",
  viewEngine: {
    extname: ".html",
    partialsDir: path.join(__dirname, "../../../emails"),
    defaultLayout: false,
  },
  viewPath: path.join(__dirname, "../../../emails"),
};

transporter.use("compile", hbs(hbsOptions));

const FROM = `Choose <${process.env.FROM_EMAIL}>`;

export const sendWelcomeEmail = async ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  const mailOptions: SendMailOptions | TemplateOptions = {
    from: FROM,
    bcc:
      process.env.SMTP_SECURE === "yes" ? process.env.COMMUNICATION_MAIL : "",
    to: email,
    template: "welcome",
    context: {
      name: name,
    },
    subject: "Testing ",
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.log("email verification mail error : " + error.toString());
    throw new ErrorWithProps(error.toString());
  }
};

export const sendCampaignMails = async (
  email: string,
  fileName: string,
  name: string,
  title: string,
  emailLink: string | null,
  campaign: string,
  imageTracker: string
): Promise<{ status: boolean; error: string | null }> => {
  let mailOptions: SendMailOptions | TemplateOptions = {
    from: FROM,
    bcc:
      process.env.SMTP_SECURE === "yes" ? process.env.COMMUNICATION_MAIL : "",
    to: email,
    template: fileName,
    context: {
      name,
      emailLink,
      email,
      campaign,
      imageTracker,
    },
    subject: title,
  };
  try {
    const resp = await transporter.sendMail(mailOptions);
    if (resp) {
      return { status: true, error: null };
    } else {
      return { status: false, error: `Error in sending email to ${email}` };
    }
  } catch (error: any) {
    return { status: false, error: error.toString() };
  }
};

export const sendOtpVerificationEmail = async (email: string, otp: string) => {
  let mailOptions: SendMailOptions | TemplateOptions = {
    from: FROM,
    bcc:
      process.env.SMTP_SECURE === "yes" ? process.env.COMMUNICATION_MAIL : "",
    to: email,
    template: "otp-verification",
    context: {
      otp: otp,
    },
    subject: "OTP for Email Verification",
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Mail sending error: " + error);
  }
};

export const sendAddTeamMemberVerification = async ({
  name,
  email,
  link,
}: {
  name: string;
  email: string;
  link: string;
}) => {
  const mailOptions: SendMailOptions | TemplateOptions = {
    from: FROM,
    bcc: process.env.SMTP_SECURE === "yes" ? "communications@inradius.in" : "",
    to: email,
    template: "team-member-onboarding",
    context: {
      verificationLink: link,
      name,
    },
    subject: "Complete your profile",
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.log("Mail sending error: " + error);
    throw new Error(error);
  }
};

export const sendCsvUploadSummaryMail = async (
  email: string,
  addedItems: number,
  updatedItems: number,
  addedCategories: number,
  addedSubCategories: number
) => {
  let mailOptions: SendMailOptions | TemplateOptions = {
    from: FROM,
    bcc:
      process.env.SMTP_SECURE === "yes" ? process.env.COMMUNICATION_MAIL : "",
    to: email,
    template: "csv-upload-summary",
    context: {
      addedItems,
      updatedItems,
      addedCategories,
      addedSubCategories,
    },
    subject: "Your recent Menu upload summary!",
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Mail sending error: " + error);
  }
};
