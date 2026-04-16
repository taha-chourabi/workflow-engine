const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected (Sequelize)');

    const syncMode = (process.env.DB_SYNC_MODE || 'safe').toLowerCase();
    if (syncMode === 'alter') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synchronized (alter)');
    } else if (syncMode === 'force') {
      await sequelize.sync({ force: true });
      console.log('✅ Models synchronized (force)');
    } else {
      // Safe mode avoids repeated ALTER TABLE statements that can duplicate indexes.
      await sequelize.sync();
      console.log('✅ Models synchronized (safe)');
    }
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };