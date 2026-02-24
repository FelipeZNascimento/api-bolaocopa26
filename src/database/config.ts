const config = {
  db: {
    connectTimeout: process.env.SQL_CONNECT_TIMEOUT ? Number(process.env.SQL_CONNECT_TIMEOUT) : 10000,
    database: process.env.SQL_DB,
    host: process.env.SQL_HOST,
    password: process.env.SQL_PASS,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 3306,
    user: process.env.SQL_USER,
    ...(process.env.SQL_SSL === "true"
      ? {
          ssl: {
            rejectUnauthorized: process.env.SQL_SSL_REJECT_UNAUTHORIZED !== "false",
          },
        }
      : {}),
  },
  listPerPage: 100,
  port: 3306,
  ssl: {
    rejectUnauthorized: true,
  },
};
export default config;
