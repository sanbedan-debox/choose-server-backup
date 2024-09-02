import { Job, JobsOptions, Queue, Worker } from "bullmq";
import { redisClient } from "../../../utils/redis";
import { refreshCloverCredentials } from "../helper/clover.helper";
import { CloverQueueData, CloverQueueType } from "../interface/clover.type";
import { CloverCredentialModel } from "../schema/clover.schema";
import { saveCloverDataWorker } from "./clover.worker";

export class CloverQueue {
  static queueName = "Clover_Queue";

  // Queue
  static queue = new Queue<CloverQueueData>(this.queueName, {
    connection: redisClient,
  });

  // Worker
  static worker = new Worker<CloverQueueData, void>(
    this.queueName,
    async (job: Job<CloverQueueData>) => {
      const { type, restaurantId, user, credsId, rowItems } = job.data;

      if (
        type === CloverQueueType.TokenRefresh &&
        restaurantId !== "" &&
        credsId
      ) {
        await refreshCloverCredentials(restaurantId);
      }

      if (
        type === CloverQueueType.SaveCloverData &&
        restaurantId !== "" &&
        user !== "" &&
        rowItems
      ) {
        await saveCloverDataWorker(restaurantId, user, rowItems);
      }

      return;
    },
    {
      connection: redisClient,
    }
  );

  static removeRepeatable = async (jobKey: string) => {
    await this.queue.removeRepeatableByKey(jobKey);
  };

  static add = async (data: CloverQueueData) => {
    let jobOptions: JobsOptions = {
      removeOnComplete: true,
      removeOnFail: true,
    };

    if (data.type === CloverQueueType.TokenRefresh) {
      jobOptions.repeat = {
        pattern: "0 0 * * *", // every 30 minutes
      };
    }

    const job = await this.queue.add(`${this.queueName}_Job`, data, jobOptions);

    if (data.type === CloverQueueType.TokenRefresh) {
      // Save the key in clover creds
      await CloverCredentialModel.updateOne(
        {
          _id: data.credsId,
          restaurantId: data.restaurantId,
        },
        { $set: { repeatJobKey: job.repeatJobKey ?? "" } }
      );
    }
  };
}
