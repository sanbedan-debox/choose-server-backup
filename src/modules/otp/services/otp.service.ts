import { compare, hash } from "bcrypt";
import { ErrorWithProps } from "mercurius";
import moment from "moment";
import { randomInt } from "node:crypto";
import { decryptData, encryptData } from "../../../utils/crypt";
import { OtpModel } from "../schema/otp.schema";

class OtpService {
  private OTP_LENGTH = 6;

  async generateOtp(
    emailOrNumber: string,
    type: "email" | "number"
  ): Promise<string> {
    try {
      // Random 6-digit OTP
      const otp = randomInt(0, 10 ** this.OTP_LENGTH)
        .toString()
        .padStart(this.OTP_LENGTH, "0");

      console.log(otp);

      // Create an OTP hash
      const otpHash = await hash(otp, 10);

      // Save all the details in OTP model
      const otpRecord = await OtpModel.create({
        otpHash: otpHash,
        emailOrNumber: emailOrNumber,
        expiresAt: moment().add(5, "minute").utc().toDate(), // 5 minutes
      });

      // Send email or message respectively with otp
      if (type === "email") {
        // await CommunicationQueue.add({
        //   type: CommunicationQueueType.SendOtpMail,
        //   email: emailOrNumber,
        //   otp: otp,
        // });
      }

      if (type === "number") {
        // TODO: Pending implementation of sending sms
      }

      // Create an encrypted otp id
      const encryptedData = encryptData(otpRecord._id.toString());

      return encryptedData;
    } catch (error) {
      throw new ErrorWithProps(
        "Unable to generate and send an OTP, please try again!"
      );
    }
  }

  async validateOtp(
    emailOrNumber: string,
    otpId: string,
    otp: string
  ): Promise<{ status: boolean; message: string }> {
    try {
      // Decrypt otpId
      const decryptedData = decryptData(otpId);

      // Get otp record
      const otpRecord = await OtpModel.findOne({
        _id: decryptedData,
      })
        .select("otpHash expiresAt emailOrNumber")
        .lean();

      if (!otpRecord) {
        return {
          status: false,
          message: "Invalid OTP, please provide valid details!",
        };
      }

      // Check if the OTP has expired
      if (moment(otpRecord.expiresAt).utc().isBefore(moment.utc())) {
        return {
          status: false,
          message: "OTP has expired, please request a new one",
        };
      }

      // Compare the emailOrNumber with stored data
      if (emailOrNumber !== otpRecord.emailOrNumber) {
        return {
          status: false,
          message: "Invalid OTP, please provide valid details!",
        };
      }

      // Compare the submitted OTP with the stored hash
      const isMatch = await compare(otp, otpRecord.otpHash);
      if (!isMatch) {
        return {
          status: false,
          message: "Invalid OTP, please provide valid details!",
        };
      }

      // Delete otp record from otp model
      await OtpModel.deleteOne({ _id: decryptedData });

      return { status: true, message: "" };
    } catch (error) {
      throw error;
    }
  }
}

export default OtpService;
