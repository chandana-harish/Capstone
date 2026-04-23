'use strict';

require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 4002;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => logger.info(`User Service running on port ${PORT}`));
  } catch (error) {
    logger.error('Failed to start user service:', error);
    process.exit(1);
  }
};

startServer();
