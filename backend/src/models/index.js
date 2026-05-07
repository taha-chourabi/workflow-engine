const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = require('./User')(sequelize, DataTypes);
const WorkflowDefinition = require('./WorkflowDefinition')(sequelize, DataTypes);
const Request = require('./Request')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const Chat = require('./Chat')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const ChatParticipant = require('./ChatParticipant')(sequelize, DataTypes);
const Friendship = require('./Friendship')(sequelize, DataTypes);

// Associations
User.hasMany(Request, { as: 'requestsCreated', foreignKey: 'createdBy' });
User.hasMany(Request, { as: 'requestsAssigned', foreignKey: 'assignedTo' });
Request.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
Request.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Request.belongsTo(User, { as: 'resolvedN1', foreignKey: 'resolvedNPlus1' });
Request.belongsTo(User, { as: 'resolvedN2', foreignKey: 'resolvedNPlus2' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Request.hasMany(Notification, { foreignKey: 'requestId' });

// Chat associations
Chat.belongsToMany(User, { through: ChatParticipant, foreignKey: 'chatId', otherKey: 'userId' });
User.belongsToMany(Chat, { through: ChatParticipant, foreignKey: 'userId', otherKey: 'chatId' });
Chat.hasMany(ChatParticipant, { foreignKey: 'chatId' });
Chat.hasMany(Message, { foreignKey: 'chatId' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'User' });
User.hasMany(Message, { foreignKey: 'senderId' });

// Friendship associations
User.hasMany(Friendship, { as: 'sentRequests', foreignKey: 'requesterId' });
User.hasMany(Friendship, { as: 'receivedRequests', foreignKey: 'addresseeId' });
Friendship.belongsTo(User, { as: 'requester', foreignKey: 'requesterId' });
Friendship.belongsTo(User, { as: 'addressee', foreignKey: 'addresseeId' });

module.exports = { sequelize, User, WorkflowDefinition, Request, Notification, Chat, Message, ChatParticipant, Friendship };