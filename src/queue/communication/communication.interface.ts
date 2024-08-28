export enum CommunicationQueueType {
  SendWelcomeMail,
  SendOtpMail,
  SendEmailVerificationLink,
}

export interface CommunicationQueueData {
  type: CommunicationQueueType;
  email: string;
  link?: string;
  otp?: string;
  name?: string;
}
