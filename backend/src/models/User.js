const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(
        'ADMIN',
        'DG',
        'DCF',
        'DCC',
        'DCRH',
        'DSI',
        'CFO_GROUPE',
        'DIRECTEUR_INVESTISSEMENT',
        'DIRECTEUR_CG',
        'DCU_SF',
        'DCU_SK',
        'HOF_MARKETING',
        'HOF_PRODUCTION',
        'HOF_IT',
        'SERVICE_RECOUVREMENT',
        'SERVICE_FISCAL',
        'CAISSIER',
        'EMPLOYEE'
      ),
      defaultValue: 'EMPLOYEE',
    },
    hierarchyLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    managerId: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    registrationStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejectedReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const bcrypt = require('bcryptjs');
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const bcrypt = require('bcryptjs');
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  });

  User.prototype.matchPassword = async function (enteredPassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
  };

  return User;
};