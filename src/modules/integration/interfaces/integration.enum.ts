import { registerEnumType } from "type-graphql";

export enum IntegrationPlatformEnum {
  Clover = "Clover",
  UberEats = "UberEats",
  DoorDash = "DoorDash",
  GrubHub = "GrubHub",
}

export enum IntegrationConnectionStatusEnum {
  Connected = "Connected",
  Expired = "Expired",
  NotConnected = "NotConnected",
  Error = "Error",
}

registerEnumType(IntegrationPlatformEnum, {
  name: "IntegrationPlatformEnum",
  description: "Integration Platform enum type ",
});

registerEnumType(IntegrationConnectionStatusEnum, {
  name: "IntegrationConnectionStatusEnum",
  description: "IntegrationConnection Status enum type ",
});
