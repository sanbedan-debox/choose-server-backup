import { registerEnumType } from "type-graphql";

export enum PermissionTypeEnum {
  AddRestaurant = "Add Restaurant",
  UpdateRestaurant = "Update Restaurant",
  UpdateBusiness = "Update Business",
  UpdateTax = "Update Tax",
  PaymentManagement = "Payment Management",
  UserManagement = "User Management",
  Rewards = "Rewards",
  Menu = "Menu",
  Offers = "Offers",
  Reports = "Reports",
  Dashboard = "Dashboard",
  Integrations = "Integrations",
  CMS = "CMS",
  Customers = "Customers",
  Orders = "Orders",
  Marketing = "Marketing",
}

export enum ConfigTypeEnum {
  MonthlySubscription = "MonthlySubscription",
  ProcessingFee = "ProcessingFee",
  TrialDays = "TrialDays",
  MaxCSVRows = "MaxCSVRows",
}

export enum ItemOptionsEnum {
  PopularItem = "PopularItem",
  UpSellItem = "UpSellItem",
  IsSpicy = "IsSpicy",
  IsVegan = "IsVegan",
  IsHalal = "IsHalal",
  IsGlutenFree = "IsGlutenFree",
  HasNuts = "HasNuts",
}

registerEnumType(PermissionTypeEnum, {
  name: "PermissionTypeEnum",
  description:
    "Enum to store the types of permissions that can be given to sub-users",
});

registerEnumType(ConfigTypeEnum, {
  name: "ConfigTypeEnum",
  description:
    "Enum to store the types of master config that can be changed by admins anytime",
});

registerEnumType(ItemOptionsEnum, {
  name: "ItemOptionsEnum",
  description: "Enum to store the options for menu items",
});
