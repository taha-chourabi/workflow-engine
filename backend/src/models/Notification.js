const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('email', 'inapp'),
      defaultValue: 'inapp',
    },
    title: DataTypes.STRING,
    message: DataTypes.TEXT,
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    requestId: {
      type: DataTypes.INTEGER,
      references: { model: 'Requests', key: 'id' },
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  return Notification;
};