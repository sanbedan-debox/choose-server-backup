import { ErrorWithProps } from "mercurius";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { decryptData, encryptData } from "../../../utils/crypt";

class TwoFactorAuthService {
  private commonError = "Something went wrong, please try again!";

  async generateSecret(
    userEmail: string
  ): Promise<{ secret: string; qrImage: string }> {
    try {
      const secret = authenticator.generateSecret();
      const encSecret = encryptData(secret);

      const otpauth = authenticator.keyuri(
        userEmail,
        `Choose POS Online Ordering (${userEmail})`,
        secret
      );

      const authenticatorQrCode = await qrcode.toDataURL(otpauth);

      return { secret: encSecret, qrImage: authenticatorQrCode };
    } catch (error) {
      throw new ErrorWithProps(this.commonError);
    }
  }

  async verifyAuthCode(secret: string, authCode: string) {
    try {
      // Verify the Auth code
      const decryptedSecret = decryptData(secret);
      const validCode = authenticator.verify({
        secret: decryptedSecret,
        token: authCode,
      });

      return validCode;
    } catch (error) {
      throw error;
    }
  }
}

export default TwoFactorAuthService;
