// backend/src/models/Message.js
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    chatId: { type: DataTypes.INTEGER, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
  }, {});

  Message.associate = (models) => {
    Message.belongsTo(models.Chat, { foreignKey: 'chatId' });
    Message.belongsTo(models.User, { foreignKey: 'senderId' });
  };

  return Message;
};