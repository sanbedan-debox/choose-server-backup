import { Field, InputType, ObjectType } from "type-graphql";
import { StatusEnum } from "../../../types/common.enum";
import { ItemOptionsEnum } from "../../masters/interface/masters.enum";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";

export enum CloverQueueType {
  TokenRefresh,
  SaveCloverData,
}

export type CloverQueueData = {
  type: CloverQueueType;
  restaurantId: string;
  user: string;
  credsId?: string;
  rowItems?: CloverRowItem[];
};

@ObjectType()
export class CloverInventory {
  @Field(() => [CloverCategories])
  categories: CloverCategories[];

  @Field(() => [CloverItems])
  items: CloverItems[];

  @Field(() => [CloverModifierGroups])
  modifierGroups: CloverModifierGroups[];

  @Field(() => [CloverModifiers])
  modifiers: CloverModifiers[];
}

@ObjectType()
export class CloverModifiers {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Number, { nullable: false })
  price: number;
}

@ObjectType()
export class CloverModifierGroups {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  minRequired: number;

  @Field(() => Number, { nullable: true, defaultValue: 1 })
  maxRequired: number;

  @Field(() => [String], { nullable: false, defaultValue: [] })
  modifiers: string[];
}

@ObjectType()
export class CloverItems {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Number, { nullable: false })
  price: number;

  @Field(() => Boolean, { nullable: false })
  status: boolean;

  @Field(() => [String], { nullable: false, defaultValue: [] })
  modifierGroups: string[];
}

@ObjectType()
export class CloverCategories {
  @Field(() => String, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Boolean, { nullable: false })
  status: boolean;

  @Field(() => [String], { nullable: false, defaultValue: [] })
  items: string[];
}

@InputType()
export class CloverRowItemModifier {
  @Field(() => String)
  name: string;

  @Field(() => Number)
  price: number;
}

@InputType()
export class CloverRowItemModifierGroup {
  @Field(() => String)
  name: string;

  @Field(() => Number, { defaultValue: 0 })
  minRequired: number;

  @Field(() => Number, { defaultValue: 1 })
  maxRequired: number;

  @Field(() => [CloverRowItemModifier], { defaultValue: [] })
  modifiers: CloverRowItemModifier[];
}

@InputType()
export class CloverRowItemCategory {
  @Field(() => String)
  name: string;

  @Field(() => Boolean)
  status: boolean;
}

@InputType()
export class CloverRowItemVisibility {
  @Field(() => MenuTypeEnum)
  menuType: MenuTypeEnum;

  @Field(() => StatusEnum)
  status: StatusEnum;
}

@InputType()
export class CloverRowItemPriceOptions {
  @Field(() => MenuTypeEnum)
  menuType: MenuTypeEnum;

  @Field(() => Number)
  price: number;
}

@InputType()
export class CloverRowItemOptions {
  @Field(() => ItemOptionsEnum)
  type: ItemOptionsEnum;

  @Field(() => Boolean)
  status: boolean;
}

@InputType()
export class CloverRowFinalItemOptions {
  @Field(() => String, { nullable: false })
  _id: string;

  @Field(() => ItemOptionsEnum, { nullable: false })
  type: ItemOptionsEnum;

  @Field(() => String, { nullable: false })
  displayName: string;

  @Field(() => String, { nullable: false })
  desc: string;

  @Field(() => Boolean, { nullable: false })
  status: boolean;
}

@InputType()
export class CloverRowItem {
  @Field(() => String)
  name: string;

  @Field(() => Number)
  price: number;

  @Field(() => Boolean)
  status: boolean;

  @Field(() => [CloverRowItemCategory], { defaultValue: [] })
  categories: CloverRowItemCategory[];

  @Field(() => [CloverRowItemModifierGroup], { defaultValue: [] })
  modifierGroups: CloverRowItemModifierGroup[];

  visibility: CloverRowItemVisibility[];

  priceOptions: CloverRowItemPriceOptions[];

  @Field(() => [CloverRowItemOptions], { defaultValue: [] })
  options: CloverRowItemOptions[];

  itemOptions: CloverRowFinalItemOptions[];
}
