import { MenuQueueType, MenuTypeEnum } from "./menu.enum";

export interface MenuQueueData {
  type: MenuQueueType;
  restaurantId: string;
  menuType?: MenuTypeEnum;
  menuId?: string;
  taxRateId?: string;
}
