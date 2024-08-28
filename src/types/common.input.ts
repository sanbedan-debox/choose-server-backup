import { Field, ID, InputType } from "type-graphql";
import { MenuTypeEnum } from "../modules/menu/interfaces/menu.enum";
import { PlaceInput } from "../modules/places/interface/index.types";
import { Day } from "../modules/restaurant/interfaces/restaurant.enums";
import { FilterOperatorsEnum, StatusEnum } from "./common.enum";

@InputType()
class StateDataInput {
  @Field(() => String, { nullable: true })
  stateId: string;

  @Field(() => String)
  stateName: string;
}

@InputType()
export class TimezoneDataInput {
  @Field(() => String, { nullable: true })
  timezoneId: string;

  @Field(() => String)
  timezoneName: string;
}

@InputType()
export class LocationCommonInput {
  @Field(() => [Number])
  coordinates: number[];
}

@InputType()
export class HoursInput {
  @Field(() => Date, { nullable: false })
  start: Date;

  @Field(() => Date, { nullable: false })
  end: Date;
}

@InputType()
export class AvailabilityInput {
  @Field(() => Day, { nullable: false })
  day: Day;

  @Field(() => [HoursInput], { nullable: false })
  hours: HoursInput[];

  @Field(() => Boolean, { nullable: false })
  active: boolean;
}

@InputType()
export class AddressInfoInput {
  @Field(() => String, { nullable: false })
  addressLine1: string;

  @Field(() => String, { nullable: true })
  addressLine2: string;

  @Field(() => StateDataInput, { nullable: false })
  state: StateDataInput;

  @Field(() => String, { nullable: false })
  city: string;

  @Field(() => Number, { nullable: false })
  zipcode: number;

  @Field(() => PlaceInput, { nullable: false })
  place: PlaceInput;

  @Field(() => LocationCommonInput, { nullable: false })
  coordinate: LocationCommonInput;
}

@InputType()
export class TaxRateInfoInput {
  @Field(() => ID, { nullable: true })
  _id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Number, { nullable: false })
  salesTax: number;
}

@InputType()
export class PaginatedFilter {
  @Field(() => String, { nullable: false })
  field: string;

  @Field(() => FilterOperatorsEnum, { nullable: false })
  operator: FilterOperatorsEnum;

  @Field(() => String, { nullable: true })
  value: string;
}

@InputType()
export class VisibilityInput {
  @Field(() => MenuTypeEnum, { nullable: false })
  menuType: string;

  @Field(() => StatusEnum, { nullable: false })
  status: string;
}

@InputType()
export class PriceOptionsInput {
  @Field(() => MenuTypeEnum, { nullable: false })
  menuType: MenuTypeEnum;

  @Field(() => Number, { nullable: false })
  price: number;
}
