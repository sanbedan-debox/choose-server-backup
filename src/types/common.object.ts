import {
  index,
  ModelOptions,
  mongoose,
  prop,
  Severity,
} from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { MenuTypeEnum } from "../modules/menu/interfaces/menu.enum";
import { Places } from "../modules/places/interface/index.types";
import { StatusEnum } from "./common.enum";

@ObjectType()
export class StateData {
  @Field()
  @prop()
  stateId: string;

  @Field()
  @prop()
  stateName: string;
}

@ObjectType()
export class TimezoneData {
  @Field()
  @prop()
  timezoneId: string;

  @Field()
  @prop()
  timezoneName: string;
}

// x & y coordinates
@ObjectType()
@index({ LocationCommon: "2dsphere" })
export class LocationCommon {
  @Field(() => String, { nullable: true })
  @prop({ type: String, default: "Point" })
  type: string;

  @Field(() => [Number])
  @prop({ type: Number })
  coordinates: mongoose.Types.Array<number>;
}

@ObjectType()
export class AddressInfo {
  @Field(() => ID)
  @prop({ auto: true })
  _id: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: false })
  @prop()
  addressLine1: string;

  @Field(() => String, { nullable: true })
  @prop()
  addressLine2: string;

  @Field(() => StateData, { nullable: false })
  @prop({ type: StateData })
  state: StateData;

  @Field(() => String, { nullable: false })
  @prop()
  city: string;

  @Field(() => Number, { nullable: false })
  @prop()
  zipcode: number;

  @Field(() => LocationCommon, { nullable: true })
  @prop({ type: LocationCommon })
  coordinate: LocationCommon;

  @Field(() => Places, { nullable: true })
  @prop({ type: Places, _id: false })
  place: Places;
}

@ObjectType()
export class TaxRateInfo {
  @Field(() => ID, { nullable: false })
  @prop({ required: true, type: mongoose.Types.ObjectId })
  _id: string;

  @Field(() => String, { nullable: false })
  @prop({ required: true })
  name: string;

  @Field(() => Number, { nullable: false })
  @prop({ required: true })
  salesTax: number;
}

@ObjectType()
export class Hours {
  @Field(() => Date)
  @prop()
  start: Date;

  @Field(() => Date)
  @prop()
  end: Date;
}

@ObjectType()
export class Availability {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: false })
  @prop()
  day: string;

  @Field(() => [Hours], { nullable: false })
  @prop({ type: Hours })
  hours: Hours[];

  @Field(() => Boolean)
  @prop({ type: Boolean })
  active: boolean;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Visibility {
  @Field(() => MenuTypeEnum, { nullable: false })
  @prop({ default: MenuTypeEnum.OnlineOrdering })
  menuType: MenuTypeEnum;

  @Field(() => StatusEnum, { nullable: false })
  @prop({})
  status: StatusEnum;
}

@ObjectType()
export class DeviceInfo {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  type: string;

  @Field(() => String)
  @prop({ required: true })
  uniqueId: string;

  @Field(() => String)
  @prop({ required: true })
  deviceName: string;

  @Field(() => String)
  @prop({ required: true })
  deviceOS: string;
}

@ObjectType()
export class AccessHistory {
  @Field(() => ID)
  _id: string;

  @Field(() => DeviceInfo)
  @prop({ required: true })
  device: DeviceInfo;

  @Field(() => Date)
  @prop()
  createdAt: Date;
}
