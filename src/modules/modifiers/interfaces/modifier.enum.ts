import { registerEnumType } from "type-graphql";

export enum PriceTypeEnum {
  FreeOfCharge = "FreeOfCharge",
  SamePrice = "SamePrice",
  IndividualPrice = "IndividualPrice",
}

registerEnumType(PriceTypeEnum, {
  name: "PriceTypeEnum",
  description: "Price type enum ",
});
