const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowDefinition = sequelize.define('WorkflowDefinition', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: DataTypes.TEXT,
    steps: {
      type: DataTypes.JSON, // stocke le tableau d'étapes (comme dans MongoDB)
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('steps');
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch (error) {
            return [];
          }
        }
        return rawValue;
      },
      set(value) {
        if (typeof value === 'string') {
          try {
            this.setDataValue('steps', JSON.parse(value));
            return;
          } catch (error) {
            this.setDataValue('steps', []);
            return;
          }
        }
        this.setDataValue('steps', value);
      },
    },
  }, {
    timestamps: true,
  });

  return WorkflowDefinition;
};