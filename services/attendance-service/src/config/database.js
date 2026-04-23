'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is not defined');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info(`Attendance Service connected to MongoDB: ${mongoose.connection.host}`);
};

module.exports = { connectDB };
