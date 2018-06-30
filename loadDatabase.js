const MongoClient = require("mongodb").MongoClient;
const config = require("./config");

async function main() {
  const MONGO_URL = `mongodb://localhost:27017/${config.DATABASE_NAME}`;

  process.stdout.write("Connecting to MongoDB... ");
  const db = await MongoClient.connect(process.env.MONGODB_URI || MONGO_URL);
  process.stdout.write("Done.\n");

  process.stdout.write("Dropping database... ");
  db.dropDatabase();
  process.stdout.write("Done.\n");

  process.stdout.write("Creating Logs collection... ");
  await db.createCollection("logs");
  process.stdout.write("Done.\n");

  process.stdout.write("Creating Warnings collection... ");
  await db.createCollection("warnings");
  process.stdout.write("Done.\n");

  process.exit();
}

main();