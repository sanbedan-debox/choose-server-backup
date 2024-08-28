import { prop } from "@typegoose/typegoose";
import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class Places {
  @Field()
  @prop()
  placeId: string;

  @Field()
  @prop()
  displayName: string;
}

@InputType()
export class PlaceInput {
  @Field()
  placeId: string;

  @Field()
  displayName: string;
}

@ObjectType()
export class PlaceDetail {
  @Field()
  latitude: number;

  @Field()
  longitude: number;
}
