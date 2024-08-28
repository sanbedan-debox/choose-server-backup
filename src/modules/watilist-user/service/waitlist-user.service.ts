import { ErrorWithProps } from "mercurius";
import { AddWaitListUserInput } from "../interface/waitlist-user.interface";
import {
  WaitListUser,
  WaitListUserModel,
} from "../schema/waitlist-user.schema";

class WaitListUserService {
  async addWaitListUser(input: AddWaitListUserInput) {
    try {
      // 1. input validation
      if (
        !input.name ||
        !input.email ||
        !input.restaurantName ||
        !input.software ||
        !input.website
      ) {
        throw new ErrorWithProps(
          "Some of the details were not provided, please try again!"
        );
      }

      if (input.number.length !== 10) {
        throw new ErrorWithProps(
          "Please enter a valid phone number and try again!"
        );
      }

      // 2. check if user already exists
      const user = await WaitListUserModel.countDocuments({
        $or: [{ email: input?.email }, { number: input?.number }],
      });

      if (user > 0) {
        throw new ErrorWithProps(
          "Your response has been received successfully!"
        );
      }

      // 3. add user
      await WaitListUserModel.create({
        name: input.name,
        email: input.email,
        restaurantName: input.restaurantName,
        website: input.website,
        software: input.software,
        number: input.number,
      });

      return true;
    } catch (error: any) {
      throw new ErrorWithProps(error);
    }
  }

  async getWaitListUsers(): Promise<WaitListUser[]> {
    try {
      const waitListUsers = await WaitListUserModel.find({}).lean();
      return waitListUsers;
    } catch (error: any) {
      console.log(error.message.toString());
      throw new ErrorWithProps(error.message.toString());
    }
  }
}

export default WaitListUserService;
