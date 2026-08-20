/**
 * Local MongoDB replica set for development (Prisma needs a replica set).
 * Usage: npx tsx scripts/start-local-mongo.ts
 * Leave this running while you use npm run dev.
 */
import fs from "fs";
import path from "path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const PORT = 27017;
const DB_NAME = "watchstore";
const dataDir = path.join(process.cwd(), ".mongo-data");

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  console.log("Starting local MongoDB replica set on port", PORT, "...");
  const replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ port: PORT, dbPath: dataDir, storageEngine: "wiredTiger" }],
    replSet: { count: 1, storageEngine: "wiredTiger", name: "rs0" },
  });

  const uri = `${replSet.getUri(DB_NAME)}`;
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    if (/^DATABASE_URL=/m.test(env)) {
      env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${uri}"`);
    } else {
      env = `# Database\nDATABASE_URL="${uri}"\n` + env;
    }
    fs.writeFileSync(envPath, env);
    console.log("Updated .env DATABASE_URL");
  }

  console.log("MongoDB ready:", uri.replace(/\/\/.*@/, "//***@"));
  console.log("Keep this process running. Ctrl+C to stop.");

  const stop = async () => {
    console.log("\nStopping MongoDB...");
    await replSet.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
