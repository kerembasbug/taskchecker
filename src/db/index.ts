import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL || "file:./data/taskchecker.db";

const client = createClient({ url });
export const db = drizzle(client, { schema });