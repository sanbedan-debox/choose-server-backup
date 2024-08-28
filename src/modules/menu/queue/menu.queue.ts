import { Job, Queue, Worker } from "bullmq";
import { redisClient } from "../../../utils/redis";
import { MenuQueueType } from "../interfaces/menu.enum";
import { MenuQueueData } from "../interfaces/menu.type";
import { addUpdateMenuTaxRateWorker, newMenuAddedWorker } from "./menu.worker";

export class MenuQueue {
  static queueName = "Menu_Queue";

  // Queue
  static queue = new Queue<MenuQueueData>(this.queueName, {
    connection: redisClient,
  });

  // Worker
  static worker = new Worker<MenuQueueData, void>(
    this.queueName,
    async (job: Job<MenuQueueData>) => {
      const { type, menuType, menuId, restaurantId, taxRateId } = job.data;

      if (type === MenuQueueType.NewMenuAdded && menuType && menuId) {
        await newMenuAddedWorker(menuType, menuId, restaurantId);
        return;
      }
      if (
        (type === MenuQueueType.TaxRateAdded ||
          type === MenuQueueType.TaxRateUpdated) &&
        taxRateId
      ) {
        await addUpdateMenuTaxRateWorker(restaurantId, taxRateId);
        return;
      }
    },
    {
      connection: redisClient,
    }
  );

  static add = async (data: MenuQueueData) => {
    await this.queue.add(`${this.queueName}_Job`, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  };
}
