import { ErrorWithProps } from "mercurius";
import Context from "../../../types/context.type";
import { PlaceDetail, Places } from "../interface/index.types";
import axios from "axios";

export class PlacesService {
  private PLACES_AUTOCOMPLETE_API =
    "https://places.googleapis.com/v1/places:autocomplete";
  private PLACE_DETAIL_API = "https://places.googleapis.com/v1/places";

  async getPlaces(input: string, ctx: Context): Promise<Places[]> {
    try {
      const data = await axios.post(
        this.PLACES_AUTOCOMPLETE_API,
        {
          input: input,
          includedRegionCodes: ["us"],
        },
        {
          headers: {
            "X-Goog-Api-Key": process.env.MAPS_API_KEY,
          },
        }
      );
      if (data.status !== 200) {
        return [];
      }

      const placesArr: Places[] = [];

      for (let i = 0; i < data.data.suggestions.length; i++) {
        const element = data.data.suggestions[i];
        const place = element.placePrediction;
        if (place) {
          placesArr.push({
            placeId: place.placeId,
            displayName: place.text.text,
          });
        }
      }

      return placesArr;
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }

  async getPlaceDetails(
    placeId: string,
    ctx: Context
  ): Promise<PlaceDetail | null> {
    try {
      const data = await axios.get(`${this.PLACE_DETAIL_API}/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": process.env.MAPS_API_KEY,
          "X-Goog-FieldMask": "id,displayName,location",
        },
      });
      if (data.status !== 200) {
        return null;
      }

      return {
        latitude: data.data.location.latitude,
        longitude: data.data.location.longitude,
      };
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }
}
