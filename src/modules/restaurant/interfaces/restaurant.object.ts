import { ModelOptions, Ref, Severity, prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import {
  IntegrationConnectionStatusEnum,
  IntegrationPlatformEnum,
} from "../../integration/interfaces/integration.enum";
import { Integration } from "../../integration/schema/integration.schema";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { Menu } from "../../menu/schema/menu.schema";

@ObjectType()
export class SocialInfo {
  @Field(() => ID)
  _id: string;

  @Field(() => String, { nullable: true })
  @prop()
  facebook: string;

  @Field(() => String, { nullable: true })
  @prop()
  instagram: string;

  @Field(() => String, { nullable: true })
  @prop()
  twitter: string;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class MenuInfo {
  @Field(() => Menu)
  @prop({ ref: "Menu" })
  _id: Ref<Menu>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => String, { nullable: true })
  @prop()
  name: string;

  @Field(() => MenuTypeEnum)
  @prop({ default: null })
  type: MenuTypeEnum;
}

@ObjectType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export class IntegrationInfo {
  @Field(() => Integration)
  @prop({ ref: "Integration" })
  _id: Ref<Integration>;

  @Field(() => String)
  @prop({ required: true })
  id: string;

  @Field(() => IntegrationPlatformEnum, { nullable: false })
  @prop({ required: true })
  platform: IntegrationPlatformEnum;

  @Field(() => IntegrationConnectionStatusEnum, { nullable: false })
  @prop({ required: true })
  connectionStatus: IntegrationConnectionStatusEnum;
}
