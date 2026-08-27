import "dotenv/config";
import { Client } from "pg";

const connections = [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["DIRECT_URL", process.env.DIRECT_URL],
];

for (const [name, connectionString] of connections) {
  if (!connectionString) {
    throw new Error(`${name} is not configured`);
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    application_name: "portfolio-connection-check",
  });

  try {
    await client.connect();
    const result = await client.query(
      "select current_user as user, current_database() as database",
    );
    const { user, database } = result.rows[0];

    if (user !== "prisma") {
      throw new Error(`${name} connected as unexpected user: ${user}`);
    }

    console.log(`${name}: connected as ${user} to ${database}`);
  } finally {
    await client.end();
  }
}
