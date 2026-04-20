module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    name: { type: DataTypes.STRING, allowNull: true },
    isGroup: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
  }, {});

  Chat.associate = (models) => {
    Chat.belongsToMany(models.User, { through: models.ChatParticipant, foreignKey: 'chatId' });
    Chat.hasMany(models.Message, { foreignKey: 'chatId' });
  };

  return Chat;
};