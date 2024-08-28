import { Ctx, Mutation, Resolver } from "type-graphql";
import Context from "../../../types/context.type";
import AuthService from "../service/auth.service";

@Resolver()
export class AuthResolver {
  constructor(private service: AuthService) {
    this.service = new AuthService();
  }

  @Mutation(() => Boolean)
  async tokensRefresh(@Ctx() ctx: Context): Promise<boolean> {
    const res = await this.service.handleTokensRefresh(ctx);
    return res;
  }
}
