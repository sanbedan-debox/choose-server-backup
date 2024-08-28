export interface OtpDetailsInterface {
  userId: string;
  otpId: string;
}

export interface MobileVerificationOtpDetails {
  phone: string;
  otpId: string;
}

export interface EmailVerificationOtpDetails {
  email: string;
  otpId: string;
}
