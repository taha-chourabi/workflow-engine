const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = require('./User')(sequelize, DataTypes);
const WorkflowDefinition = require('./WorkflowDefinition')(sequelize, DataTypes);
const Request = require('./Request')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);

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

module.exports = { sequelize, User, WorkflowDefinition, Request, Notification };