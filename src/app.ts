import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import mySqlSession from "express-mysql-session";
import expressSession from "express-session";
import helmet from "helmet";

import adminRoutes from "#admin/admin.routes.js";
import betRoutes from "#bet/bet.routes.js";
import { connection } from "#database/db.js";
import editionRoutes from "#edition/edition.routes.js";
import { httpLogger } from "#logger/logger.middleware.js";
import { logger } from "#logger/logger.service.js";
import matchRoutes from "#match/match.routes.js";
import { errorHandler } from "#middlewares/errorHandler.js";
import { cache, middleware, updateUserActivity } from "#middlewares/middlewares.js";
import newsRoutes from "#news/news.routes.js";
import rankingRoutes from "#ranking/ranking.routes.js";
import teamRoutes from "#team/team.routes.js";
import userRoutes from "#user/user.routes.js";
import { UserService } from "#user/user.service.js";
import { IUser } from "#user/user.types.js";

const app = express();
const environment = process.env.NODE_ENV ?? "development";
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const sessionSecret = process.env.SESSION_SECRET ?? "this is not secure";

// Environments that serve over HTTPS and accept cross-origin requests
const isCrossOriginEnv = ["pprod", "production"].includes(environment);

// Required when running behind a reverse proxy (nginx): makes req.secure reflect
// the original client connection (HTTPS) via the X-Forwarded-Proto header,
// so express-session sets the Secure cookie flag correctly.
if (isCrossOriginEnv) {
  app.set("trust proxy", 1);
}

export interface ISessionSettings extends expressSession.SessionOptions {
  user: IUser | undefined;
}

const sessionSettings: ISessionSettings = {
  cookie: {
    maxAge: sevenDays,
    sameSite: isCrossOriginEnv ? "none" : "strict",
    secure: isCrossOriginEnv,
  },
  resave: false,
  rolling: true,
  saveUninitialized: false,
  secret: sessionSecret,
  user: undefined,
};

const allowedOrigins = [
  "https://localhost",
  "http://localhost",
  "http://127.0.0.1:3000",
  "https://localhost:3000",
  "http://localhost:3000",
  /\.omegafox\.me$/,
  /\.sharpion\.cloud$/,
];

const corsOptions = {
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  origin: allowedOrigins,
};

// CORS must be registered before session middleware so preflight OPTIONS
// requests are resolved before any other middleware runs.
app.use(helmet());
app.use(cors(corsOptions));

const MySQLStore = mySqlSession(expressSession as never);
// Use existing connection pool instead of creating a new one
const sessionStore = new MySQLStore(
  {
    // Disable automatic cleanup to prevent timeout crashes
    // Clean up manually via cron job or scheduled task instead
    clearExpired: false,
    expiration: sevenDays,
  },
  connection as never,
);

// Handle session store errors to prevent app crashes
sessionStore.on("error", (error: Error) => {
  logger.error({ err: error }, "Session store error");
});

app.use(
  expressSession({
    ...sessionSettings,
    store: sessionStore,
  }),
);

sessionStore
  .onReady()
  .then(() => {
    // MySQL session store ready for use.
    logger.info("MySQLStore ready");
  })
  .catch((error: unknown) => {
    // Something went wrong.
    logger.error({ err: error }, "MySQLStore initialization error");
  });

app.use(express.json());

// HTTP request/response logging
app.use(httpLogger);

// Update user activity on every request with an active session
const userService = new UserService();
app.use(updateUserActivity(userService));

app.use("/admin", cache(), adminRoutes);
app.use("/team", cache(), teamRoutes);
app.use("/match", matchRoutes);
app.use("/bet", betRoutes);
app.use("/user", userRoutes);
app.use("/edition", editionRoutes);
app.use("/ranking", rankingRoutes);
app.use("/news", newsRoutes);

app.get("/", [middleware]);

// Error Handler should be last
const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  errorHandler(err as Error, req, res, next);
};
app.use(errorMiddleware);

export default app;
