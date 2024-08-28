import { AdminResolver } from "../modules/admin/resolver/admin.resolver";
import { AuthResolver } from "../modules/auth/resolver/auth.resolver";
import { BusinessResolver } from "../modules/business/resolver/business.resolver";
import { CampaignResolver } from "../modules/campaign/resolvers/campaign.resolver";
import { CategoryResolver } from "../modules/categories/resolver/category.resolver";
import { CloverResolver } from "../modules/clover/resolver/clover.resolver";
import { CSVResolver } from "../modules/csv/resolver/csv.resolver";
import { IntegrationResolver } from "../modules/integration/resolver/integration.resolver";
import { ItemResolver } from "../modules/items/resolver/item.resolver";
import { MastersResolver } from "../modules/masters/resolver/masters.resolver";
import { MenuResolver } from "../modules/menu/resolvers/menu.resolver";
import { ModifierResolver } from "../modules/modifiers/resolver/modifier.resolver";
import { PlacesResolver } from "../modules/places/resolver/index.resolver";
import { RestaurantResolver } from "../modules/restaurant/resolvers/restaurant.resolver";
import { SubCategoryResolver } from "../modules/subCategories/resolver/subCategories.resolver";
import { TaxRateResolver } from "../modules/taxRate/resolvers/taxRate.resolver";
import { TeamsResolver } from "../modules/teams/resolver/teams.resolver";
import { UserResolver } from "../modules/user/resolvers/user.resolver";
import { WaitListUserResolver } from "../modules/watilist-user/resolver/waitlist-user.resolver";

export const resolvers = [
  AdminResolver,
  WaitListUserResolver,
  CampaignResolver,
  UserResolver,
  RestaurantResolver,
  MenuResolver,
  CategoryResolver,
  TaxRateResolver,
  ItemResolver,
  ModifierResolver,
  MastersResolver,
  PlacesResolver,
  BusinessResolver,
  TeamsResolver,
  SubCategoryResolver,
  CSVResolver,
  AuthResolver,
  CloverResolver,
  IntegrationResolver,
] as const;
