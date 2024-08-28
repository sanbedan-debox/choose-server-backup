import { Field, InputType } from "type-graphql";
import {
  AddressInfoInput,
  AvailabilityInput,
  TimezoneDataInput,
} from "../../../types/common.input";
import {
  BeverageCategory,
  Day,
  FoodType,
  MeatType,
  RestaurantCategory,
  RestaurantStatus,
  RestaurantType,
} from "./restaurant.enums";

@InputType()
export class AvailabilityDateInput {
  @Field(() => Day, { nullable: false })
  day: Day;

  @Field(() => Date, { nullable: false })
  start: Date;

  @Field(() => Date, { nullable: false })
  end: Date;

  @Field(() => RestaurantStatus, { nullable: true })
  status: RestaurantStatus;
}

@InputType()
export class SocialInfoInput {
  @Field(() => String, { nullable: true })
  facebook: string;

  @Field(() => String, { nullable: true })
  instagram: string;

  @Field(() => String, { nullable: true })
  twitter: string;

  @Field(() => String, { nullable: true })
  website: string;
}

@InputType()
export class RestaurantDetailsInput {
  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => AddressInfoInput, { nullable: true }) // pending
  address: AddressInfoInput;

  @Field(() => String, { nullable: true })
  brandingLogo: string;

  @Field(() => SocialInfoInput, { nullable: true })
  socialInfo: SocialInfoInput;

  @Field(() => String, { nullable: true })
  website: string;

  @Field(() => TimezoneDataInput, { nullable: true })
  timezone: TimezoneDataInput;

  @Field(() => [RestaurantCategory], { nullable: true })
  category: RestaurantCategory[];

  @Field(() => [BeverageCategory], { nullable: true })
  beverageCategory: BeverageCategory[];

  @Field(() => [FoodType], { nullable: true })
  foodType: FoodType[];

  @Field(() => MeatType, { nullable: true })
  meatType: MeatType;

  @Field(() => RestaurantType, { nullable: true })
  type: RestaurantType;

  @Field(() => Number, { nullable: true })
  dineInCapacity: number;

  @Field(() => [AvailabilityInput], { nullable: true })
  availability: AvailabilityInput[];
}
