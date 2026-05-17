const config = {
  db: {
    acquireTimeout: process.env.SQL_ACQUIRE_TIMEOUT ? Number(process.env.SQL_ACQUIRE_TIMEOUT) : 30000,
    connectionLimit: process.env.SQL_CONNECTION_LIMIT ? Number(process.env.SQL_CONNECTION_LIMIT) : 20,
    connectTimeout: process.env.SQL_CONNECT_TIMEOUT ? Number(process.env.SQL_CONNECT_TIMEOUT) : 10000,
    database: process.env.SQL_DB,
    host: process.env.SQL_HOST,
    password: process.env.SQL_PASS,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 3306,
    queueLimit: 0,
    user: process.env.SQL_USER,
    waitForConnections: true,
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
