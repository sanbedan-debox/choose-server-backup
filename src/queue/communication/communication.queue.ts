import { Job, Queue, Worker } from "bullmq";
import {
  sendAddTeamMemberVerification,
  sendOtpVerificationEmail,
  sendWelcomeEmail,
} from "../../modules/emailers/service";
import { redisClient } from "../../utils/redis";
import {
  CommunicationQueueData,
  CommunicationQueueType,
} from "./communication.interface";

export class CommunicationQueue {
  static readonly queueName = "Communication_Queue";

  // Queue
  static readonly queue = new Queue<CommunicationQueueData>(this.queueName, {
    connection: redisClient,
  });

  // Worker
  static readonly worker = new Worker<CommunicationQueueData, void>(
    this.queueName,
    async (job: Job<CommunicationQueueData>) => {
      const { email, type, otp, link, name } = job.data;
      if (type === CommunicationQueueType.SendOtpMail && otp) {
        await sendOtpVerificationEmail(email, otp);
      }

      if (type === CommunicationQueueType.SendWelcomeMail && name) {
        await sendWelcomeEmail({ email, name });
      }

      if (
        type === CommunicationQueueType.SendEmailVerificationLink &&
        link &&
        name
      ) {
        await sendAddTeamMemberVerification({ name, email, link });
      }
    },
    {
      connection: redisClient,
    }
  );

  static readonly add = async (data: CommunicationQueueData) => {
    await this.queue.add(`${this.queueName}_Job`, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  };
}
