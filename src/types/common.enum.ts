import { registerEnumType } from "type-graphql";

export enum StatusEnum {
  active = "active",
  inactive = "inactive",
}

export enum FilterOperatorsEnum {
  equalTo = "equalTo",
  notEqualTo = "notEqualTo",
  lessThan = "lessThan",
  lessThanOrEqualTo = "lessThanOrEqualTo",
  greaterThan = "greaterThan",
  greaterThanOrEqualTo = "greaterThanOrEqualTo",
  any = "any",
}

registerEnumType(StatusEnum, {
  name: "StatusEnum",
  description: "Status enum ",
});

registerEnumType(FilterOperatorsEnum, {
  name: "FilterOperatorsEnum",
  description: "Apply filter operators while fetching the data ",
});
