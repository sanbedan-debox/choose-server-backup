import { Job, Queue, Worker } from "bullmq";
import { redisClient } from "../../../utils/redis";
import { CsvQueueType } from "../interface/csv.enum";
import { CsvQueueData } from "../interface/csv.types";
import { saveCsvDataWorker } from "./csv.worker";

export class CsvQueue {
  static queueName = "Csv_Queue";

  // Queue
  static queue = new Queue<CsvQueueData>(this.queueName, {
    connection: redisClient,
  });

  // Worker
  static worker = new Worker<CsvQueueData, void>(
    this.queueName,
    async (job: Job<CsvQueueData>) => {
      const { type, items, menu, user, restaurant } = job.data;
      if (
        type === CsvQueueType.SaveData &&
        items &&
        menu &&
        user &&
        restaurant
      ) {
        await saveCsvDataWorker(items, menu, user, restaurant);
      }
    },
    {
      connection: redisClient,
    }
  );

  static add = async (data: CsvQueueData) => {
    await this.queue.add(`${this.queueName}_Job`, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  };
}
