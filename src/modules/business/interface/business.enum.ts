import { registerEnumType } from "type-graphql";

export enum BusinessTypeEnum {
  SoleProprietor = "Sole Proprietor",
  LP = "LP",
  LLP = "LLP",
  LLC = "LLC",
  Corporation = "Corporation",
}

export enum StaffCountEnum {
  "From0To10" = "0 to 10",
  "From11to25" = "11 to 25",
  "From26to40" = "26 to 40",
  "Above40" = "Above 41",
}

export enum EstimatedRevenueEnum {
  "From0to50K" = "$0 to $50,000",
  "From50Kto200K" = "$50,000 to $200,000",
  "From200Kto500K" = "$200,000 to $500,000",
  "From500Kto1M" = "$500,000 to $1,000,000",
  "Above1M" = "Above $1,000,000",
}

registerEnumType(BusinessTypeEnum, {
  name: "BusinessTypeEnum",
  description: "Business type enum",
});

registerEnumType(StaffCountEnum, {
  name: "StaffCountEnum",
  description: "Enum used for storing static values of Staff Size",
});

registerEnumType(EstimatedRevenueEnum, {
  name: "EstimatedRevenueEnum",
  description: "Enum used for storing static values of Estimated Revenue",
});
