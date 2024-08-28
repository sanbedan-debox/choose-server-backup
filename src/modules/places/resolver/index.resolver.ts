import { Arg, Ctx, Query, Resolver, UseMiddleware } from "type-graphql";
import Context from "../../../types/context.type";
import { PlacesService } from "../services/index.service";
import { PlaceDetail, Places } from "../interface/index.types";
import { isAuthenticated } from "../../../middlewares/authentication";

@Resolver()
export class PlacesResolver {
  constructor(private service: PlacesService) {
    this.service = new PlacesService();
  }

  @Query(() => [Places])
  @UseMiddleware([isAuthenticated])
  getPlacesList(@Arg("input") input: string, @Ctx() ctx: Context) {
    return this.service.getPlaces(input, ctx);
  }

  @Query(() => PlaceDetail, { nullable: true })
  @UseMiddleware([isAuthenticated])
  getPlaceDetails(@Arg("placeId") placeId: string, @Ctx() ctx: Context) {
    return this.service.getPlaceDetails(placeId, ctx);
  }
}
