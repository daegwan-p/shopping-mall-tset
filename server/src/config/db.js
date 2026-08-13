const mongoose = require("mongoose");
const { resolveMongoUri } = require("./mongoUri");

const connectDB = async () => {
  const uri = resolveMongoUri();

  if (!uri) {
    throw new Error(
      "MongoDB URI가 없습니다. MONGODB_ATLAS_URI 또는 MONGODB_URI를 server/.env에 설정해 주세요."
    );
  }

  await mongoose.connect(uri);
  const source = process.env.MONGODB_ATLAS_URI?.trim()
    ? "Atlas"
    : process.env.MONGODB_URI?.trim()
      ? "MONGODB_URI"
      : "local-default";
  console.log(`MongoDB connected (${source}): ${mongoose.connection.name}`);
};

module.exports = connectDB;
