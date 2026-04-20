// backend/src/models/ChatParticipant.js
module.exports = (sequelize, DataTypes) => {
  const ChatParticipant = sequelize.define('ChatParticipant', {
    chatId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  }, { timestamps: false });

  ChatParticipant.associate = (models) => {
    ChatParticipant.belongsTo(models.Chat, { foreignKey: 'chatId' });
    ChatParticipant.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return ChatParticipant;
};