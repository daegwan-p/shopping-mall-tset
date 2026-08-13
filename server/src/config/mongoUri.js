const LOCAL_URI = "mongodb://127.0.0.1:27017/shopping-mall";

/**
 * Prefer Atlas URI when set; otherwise MONGODB_URI; otherwise local.
 */
function resolveMongoUri() {
  const atlas = String(process.env.MONGODB_ATLAS_URI || "").trim();
  if (atlas) return atlas;

  const uri = String(process.env.MONGODB_URI || "").trim();
  if (uri) return uri;

  return LOCAL_URI;
}

module.exports = {
  resolveMongoUri,
  LOCAL_URI,
};
