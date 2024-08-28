import { registerEnumType } from "type-graphql";

export enum MenuTypeEnum {
  OnlineOrdering = "onlineOrdering",
  DineIn = "dineIn",
  Catering = "catering",
}

export enum MenuQueueType {
  NewMenuAdded = "NewMenuAdded",
  TaxRateAdded = "TaxRateAdded",
  TaxRateUpdated = "TaxRateUpdated",
}

registerEnumType(MenuTypeEnum, {
  name: "MenuTypeEnum",
  description: "Menu type enum",
});
