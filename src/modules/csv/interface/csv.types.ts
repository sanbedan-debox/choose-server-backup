import { CsvQueueType } from "./csv.enum";

export interface CsvRowItem {
  category: string;
  categoryDesc: string;
  subCategory: string | null;
  subCategoryDesc: string | null;
  itemName: string;
  itemDesc: string;
  itemPrice: number;
  itemStatus: boolean;
  onlineOrdering: boolean;
  dineIn: boolean;
  catering: boolean;
  itemLimit: number | null;
  popularItem: boolean;
  upSellItem: boolean;
  isVegan: boolean;
  hasNuts: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
  isSpicy: boolean;
}

export interface CsvQueueData {
  type: CsvQueueType;
  items?: CsvRowItem[];
  menu?: string;
  user?: string;
  restaurant?: string;
}
