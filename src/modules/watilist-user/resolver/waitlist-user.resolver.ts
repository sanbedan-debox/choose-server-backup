import { Arg, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isAdmin } from "../../../middlewares/authorisation";
import { AddWaitListUserInput } from "../interface/waitlist-user.interface";
import { WaitListUser } from "../schema/waitlist-user.schema";
import WaitListUserService from "../service/waitlist-user.service";

@Resolver()
export class WaitListUserResolver {
  constructor(private waitListUserService: WaitListUserService) {
    this.waitListUserService = new WaitListUserService();
  }

  @Mutation(() => Boolean)
  addWaitListUser(@Arg("input") input: AddWaitListUserInput) {
    return this.waitListUserService.addWaitListUser(input);
  }

  @Query(() => [WaitListUser])
  @UseMiddleware([isAuthenticated, isAdmin])
  getWaitListUsers() {
    return this.waitListUserService.getWaitListUsers();
  }
}
