import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

// Managed Cloud SQL instance in region asia-southeast1
export const CLOUD_SQL_REGION = "asia-southeast1";

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!sqlHost) {
  throw new Error("SQL_HOST must be set in environment variables.");
}
if (!sqlDbName) {
  throw new Error("SQL_DB_NAME must be set in environment variables.");
}
if (!user) {
  throw new Error("SQL_ADMIN_USER must be set in environment variables.");
}
if (!password) {
  throw new Error("SQL_ADMIN_PASSWORD must be set in environment variables.");
}

// Enable SSL for TCP connections; Cloud SQL Auth Proxy Unix domain sockets (/cloudsql/...) encrypt in-transit via the proxy tunnel
const isUnixSocket = sqlHost.startsWith("/");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: isUnixSocket ? false : { rejectUnauthorized: false },
  },
  verbose: true,
});
