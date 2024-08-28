import { Job, Queue, Worker } from "bullmq";
import moment from "moment";
import { redisClient } from "../../../utils/redis";
import { CampaignsQueueData } from "../interface/campaign.types";
import { campaignWorker } from "./index.worker";

export class CampaignQueue {
  static queueName = "Campaigns_Queue";

  // Queue
  static queue = new Queue<CampaignsQueueData>(this.queueName, {
    connection: redisClient,
  });

  // Worker
  static worker = new Worker<CampaignsQueueData, void>(
    this.queueName,
    async (job: Job<CampaignsQueueData>) => {
      await campaignWorker(job.data);
      return;
    },
    {
      connection: redisClient,
    }
  );

  static add = async (data: CampaignsQueueData) => {
    let delay: number = 0;
    if (data.scheduleTime) {
      const current = moment();
      const scheduled = moment(data.scheduleTime);
      delay = scheduled.diff(current, "milliseconds");
    }
    await this.queue.add(`${this.queueName}_Job`, data, {
      removeOnComplete: true,
      removeOnFail: true,
      delay: delay,
    });
  };
}
