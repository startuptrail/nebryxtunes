const mongoose = require('mongoose');
const config = require('../../config');

let databaseReady = false;

function looksLikeMongoUri(uri) {
  return /^mongodb(\+srv)?:\/\//i.test(String(uri || '').trim());
}

async function connect() {
  mongoose.set('bufferCommands', false);
  const mongoUri = String(config.mongoUri || '').trim();

  if (!looksLikeMongoUri(mongoUri)) {
    console.warn('?? [DATABASE] MongoDB disabled: MONGO_URI is missing/invalid. Continuing without database.');
    databaseReady = false;
    return false;
  }

  try {
    console.log('?? [DATABASE] MongoDB Connecting');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('?? [DATABASE] MongoDB Connected');
    databaseReady = true;
    return true;
  } catch (error) {
    console.error('?? [DATABASE] MongoDB Connection Error:', error?.message || error);
    console.warn('?? [DATABASE] Continuing in degraded mode without database.');
    databaseReady = false;
    return false;
  }
}

function isDatabaseReady() {
  return databaseReady && mongoose.connection.readyState === 1;
}

module.exports = { connect, isDatabaseReady };
