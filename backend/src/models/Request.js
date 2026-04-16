const { DataTypes } = require('sequelize');

const parseJsonIfNeeded = (value, fallbackValue) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallbackValue;
  }
};

module.exports = (sequelize) => {
  const Request = sequelize.define('Request', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING,
      unique: true,
    },
    workflowType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currentStepIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('draft', 'in_progress', 'pending', 'approved', 'rejected', 'returned'),
      defaultValue: 'draft',
    },
    data: {
      type: DataTypes.JSON, // stocke les champs du formulaire
      defaultValue: {},
      get() {
        return parseJsonIfNeeded(this.getDataValue('data'), {});
      },
      set(value) {
        this.setDataValue('data', parseJsonIfNeeded(value, {}));
      },
    },
    attachments: {
      type: DataTypes.JSON, // tableau de chemins
      defaultValue: [],
      get() {
        return parseJsonIfNeeded(this.getDataValue('attachments'), []);
      },
      set(value) {
        this.setDataValue('attachments', parseJsonIfNeeded(value, []));
      },
    },
    history: {
      type: DataTypes.JSON, // tableau d'objets { stepName, actor, action, comment, timestamp, attachments }
      defaultValue: [],
      get() {
        return parseJsonIfNeeded(this.getDataValue('history'), []);
      },
      set(value) {
        this.setDataValue('history', parseJsonIfNeeded(value, []));
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: false,
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: true,
    },
    resolvedNPlus1: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: true,
    },
    resolvedNPlus2: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' },
      allowNull: true,
    },
    finalPdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    hooks: {
      afterCreate: async (request) => {
        if (!request.reference) {
          const prefix = 'DEM';
          const reference = `${prefix}${String(request.id).padStart(6, '0')}`;
          await request.update({ reference }, { hooks: false });
        }
      },
    },
  });

  return Request;
};