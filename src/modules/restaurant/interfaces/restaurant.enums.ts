import { registerEnumType } from "type-graphql";

export enum Day {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}

export enum RestaurantStatus {
  active = "active",
  inactive = "inactive",
  blocked = "blocked",
  blockedBySystem = "blockedBySystem",
  onboardingPending = "onboardingPending",
}

export enum RestaurantType {
  Independent = "Independent",
  PartOfChain = "PartOfChain",
}

export enum RestaurantCategory {
  DineIn = "DineIn",
  PremiumDineIn = "PremiumDineIn",
  QSR = "QSR",
  CloudKitchen = "CloudKitchen",
  Takeout = "Takeout",
}

export enum BeverageCategory {
  Alcohol = "Alcohol",
  NonAlcohol = "NonAlcohol",
}

export enum FoodType {
  Vegetarian = "Vegetarian",
  NonVegetarian = "NonVegetarian",
  Vegan = "Vegan",
}

export enum MeatType {
  Halal = "Halal",
  NonHalal = "NonHalal",
}

registerEnumType(Day, {
  name: "Day",
  description: "The day",
});

registerEnumType(RestaurantStatus, {
  name: "RestaurantStatus",
  description: "Restaurant status enum.",
});

registerEnumType(RestaurantType, {
  name: "RestaurantType",
  description: "Restaurant type enum.",
});

registerEnumType(RestaurantCategory, {
  name: "RestaurantCategory",
  description: "Restaurant category type enum.",
});

registerEnumType(BeverageCategory, {
  name: "BeverageCategory",
  description: "Restaurant beverage category type enum.",
});

registerEnumType(FoodType, {
  name: "FoodType",
  description: "Restaurant food type enum.",
});

registerEnumType(MeatType, {
  name: "MeatType",
  description: "Restaurant Meat type enum.",
});
