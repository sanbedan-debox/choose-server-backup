import { FastifyReply } from "fastify/types/reply";
import { FastifyRequest } from "fastify/types/request";
import { AdminRole } from "../modules/admin/interface/admin.interface";
import { UserRole } from "../modules/user/interfaces/user.enum";
import { UserPermission } from "../modules/user/interfaces/user.objects";

type Context = {
  req: FastifyRequest;
  rep: FastifyReply;
  user: string | undefined;
  role: AdminRole | UserRole | undefined;
  restaurantId: string | undefined;
  accountOwner: string | undefined;
  permissions: UserPermission[];
};

export default Context;
