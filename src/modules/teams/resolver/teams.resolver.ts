import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { isAuthenticated } from "../../../middlewares/authentication";
import { isUser } from "../../../middlewares/authorisation";
import { loadAccountOwner, loadPermissions } from "../../../middlewares/loader";
import Context from "../../../types/context.type";
import {
  AddTeamMemberInput,
  RestaurantSubuserInput,
  UpdateSubuserPermissionsInput,
  UpdateSubuserRoleInput,
} from "../interface/teams.input";
import { SubUser } from "../schema/teams.schema";
import { TeamsService } from "../service/teams.service";

export class TeamsResolver {
  constructor(private teamsService: TeamsService) {
    this.teamsService = new TeamsService();
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async addTeamMember(
    @Arg("input") input: AddTeamMemberInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.addTeamMember(input, ctx);
  }

  @Mutation(() => Boolean)
  async verifyTeamEmail(@Arg("token") token: string): Promise<boolean> {
    return await this.teamsService.verifyTeamEmail(token);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async updateSubuserRole(
    @Arg("input") input: UpdateSubuserRoleInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.updateSubuserRole(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async updateSubuserPermissions(
    @Arg("input") input: UpdateSubuserPermissionsInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.updateSubuserPermissions(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async addRestaurantSubuser(
    @Arg("input") input: RestaurantSubuserInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.addRestaurantSubuser(input, ctx);
  }

  @Mutation(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async removeRestaurantSubuser(
    @Arg("input") input: RestaurantSubuserInput,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.removeRestaurantSubuser(input, ctx);
  }

  @Query(() => [SubUser])
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async getTeamMembers(@Ctx() ctx: Context): Promise<SubUser[]> {
    return await this.teamsService.getTeamMembers(ctx);
  }

  @Query(() => Boolean)
  @UseMiddleware([isAuthenticated, isUser, loadPermissions, loadAccountOwner])
  async deleteTeamMember(
    @Arg("id") id: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    return await this.teamsService.deleteTeamMember(id, ctx);
  }
}
