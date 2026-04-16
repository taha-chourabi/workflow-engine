const { WorkflowDefinition } = require('../models');

const createWorkflow = async (req, res) => {
  const workflow = await WorkflowDefinition.create(req.body);
  res.status(201).json(workflow);
};

const updateWorkflow = async (req, res) => {
  const workflow = await WorkflowDefinition.findByPk(req.params.id);
  if (!workflow) return res.status(404).json({ message: 'Workflow non trouvé' });
  await workflow.update(req.body);
  res.json(workflow);
};

const getAllWorkflows = async (req, res) => {
  const workflows = await WorkflowDefinition.findAll();
  res.json(workflows);
};

const getWorkflowByName = async (req, res) => {
  const workflow = await WorkflowDefinition.findOne({ where: { name: req.params.name } });
  if (!workflow) return res.status(404).json({ message: 'Workflow non trouvé' });
  res.json(workflow);
};

module.exports = { createWorkflow, updateWorkflow, getAllWorkflows, getWorkflowByName };