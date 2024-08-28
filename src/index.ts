import dotenv from "dotenv";
import "dotenv/config";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { makeExecutableSchema } from "@graphql-tools/schema";
import AltairFastify from "altair-fastify-plugin";
import Fastify from "fastify";
import mercurius, { ErrorWithProps, MercuriusError } from "mercurius";
import "reflect-metadata";
import { buildTypeDefsAndResolvers } from "type-graphql";
import {
  TrackEmailOpenParams,
  TrackLinkClickParams,
} from "./modules/campaign/interface/campaign.types";
import CampaignService from "./modules/campaign/service/campaign.service";
import { resolvers as typedResolvers } from "./resolvers/index.resolver";
import Context from "./types/context.type";
import { CookieKeys } from "./utils/cookie";
import { connectToMongoDb } from "./utils/dbConnection";
import { isProduction } from "./utils/helper";
import { verifyAccessToken } from "./utils/jwt";

// Init DotEnv
dotenv.config();

// Init Fastify App
const app = Fastify({
  logger: false,
});

// Bootstraping server
async function startServer() {
  try {
    // MongoDB Connection
    await connectToMongoDb();

    // Build typedefs and resolvers for all our modules
    const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
      resolvers: typedResolvers,
    });

    // Make a schema file from the typedefs and resolver
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // Register Rate Limitter
    await app.register(import("@fastify/rate-limit"), {
      max: 100,
      timeWindow: 1000 * 60,
    });

    // Register helmet plugin
    await app.register(helmet, { contentSecurityPolicy: isProduction });

    // Register CORS plugin
    await app.register(cors, {
      origin: [
        "https://www.choosepos.com",
        "https://restaurant.choosepos.com",
        "https://admin.choosepos.com",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    });

    // Register cookie plugin
    await app.register(cookie, {
      secret: process.env.COOKIE_SECRET,
      parseOptions: {},
    });

    // Mercurius setup for graphql
    app.register(mercurius, {
      schema,
      queryDepth: 7,
      graphiql: true,
      context: async (request, reply) => {
        const context: Context = {
          req: request,
          rep: reply,
          role: undefined,
          user: undefined,
          restaurantId: undefined,
          accountOwner: undefined,
          permissions: [],
        };

        const cookie = request.cookies;
        const accessToken = cookie[CookieKeys.ACCESS_TOKEN];
        const refreshToken = cookie[CookieKeys.REFRESH_TOKEN];

        if (accessToken && refreshToken) {
          const user = await verifyAccessToken(accessToken);
          if (user !== null) {
            context.user = user._id.toString();
            context.role = user.role;
          }
        }

        if (cookie[CookieKeys.RESTAURANT_ID_ONBOARDING]) {
          context.restaurantId = cookie[CookieKeys.RESTAURANT_ID_ONBOARDING];
        }

        if (cookie[CookieKeys.RESTAURANT_ID]) {
          context.restaurantId = cookie[CookieKeys.RESTAURANT_ID];
        }

        return context;
      },
      errorFormatter: (result, context) => {
        const err = result.errors[0].originalError instanceof ErrorWithProps;
        let message = "Something went wrong, please try again";
        let status = 200;

        if (err) {
          const error = result.errors[0].originalError as MercuriusError;
          message = error.message ?? "Something went wrong, please try again";
          status = error.statusCode ?? 200;
        }

        return {
          statusCode: status,
          response: {
            data: null,
            errors: [{ message }],
          },
        };
      },
    });

    // Register Altair GraphQL IDE
    app.register(AltairFastify, {
      initialSettings: { "request.withCredentials": true },
    });

    // Register routes
    app.get("/", async (req, res) => {
      res.status(200).send(`Healthcheck Pass`);
    });

    app.get<{ Params: TrackLinkClickParams }>(
      "/email-campaign/track/click/:shortId/:email",
      async (req, res) => {
        const service = new CampaignService();
        await service.trackLinkClick(req, res);
      }
    );

    app.get<{ Params: TrackEmailOpenParams }>(
      "/email-campaign/track/open/:campaignId/:email/image.png",
      async (req, res) => {
        const service = new CampaignService();
        await service.trackEmailOpen(req, res);
      }
    );

    app.setErrorHandler(function (error, request, reply) {
      reply.send(error);
    });

    await app.listen({ port: 4000 });
    console.log(`Server started on http://localhost:${process.env.PORT} 🚀`);
  } catch (error: any) {
    console.error(error.message);
  }
}

startServer();
