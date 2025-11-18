import { defineConfig } from "drizzle-kit";

if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error("MYSQL_DATABASE_URL is required, ensure the MySQL database is configured");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_DATABASE_URL,
  },
});
