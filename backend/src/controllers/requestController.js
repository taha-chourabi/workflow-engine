const { Request, WorkflowDefinition, User } = require('../models');
const { transitionRequest, resolveHierarchy, getTargetUser } = require('../services/workflowEngine');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

const createRequest = async (req, res, next) => {
  try {
    const { workflowType, data, attachments } = req.body;
    const workflow = await WorkflowDefinition.findOne({ where: { name: workflowType } });
    if (!workflow) return res.status(400).json({ message: 'Workflow inconnu' });
    const { nPlus1, nPlus2 } = await resolveHierarchy(req.user.id);
    const request = await Request.create({
      workflowType, data, attachments: attachments || [], createdBy: req.user.id,
      status: 'draft', currentStepIndex: 0, resolvedNPlus1: nPlus1?.id, resolvedNPlus2: nPlus2?.id,
    });
    res.status(201).json(request);
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Reference de demande deja utilisee, veuillez reessayer' });
    }
    return next(error);
  }
};

const submitRequest = async (req, res) => {
  const request = await Request.findByPk(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demande introuvable' });
  if (request.createdBy !== req.user.id) return res.status(403).json({ message: 'Non autorisé' });
  if (request.status !== 'draft') return res.status(400).json({ message: 'Déjà soumise' });

  const workflow = await WorkflowDefinition.findOne({ where: { name: request.workflowType } });
  const firstStep = workflow.steps[0];
  const firstActor = await getTargetUser(firstStep, request, request.createdBy);

  if (!firstActor) {
    return res.status(400).json({ message: 'Aucun acteur trouve pour la premiere etape du workflow' });
  }

  if (firstActor) {
    request.assignedTo = firstActor.id;
    await emailService.sendStepNotification(firstActor.email, request.reference, firstStep.name, `${process.env.FRONTEND_URL}/requests/${request.id}`);
  }
  request.status = 'in_progress';
  await request.save();
  res.json(request);
};

const updateDraftRequest = async (req, res) => {
  const { workflowType, data } = req.body;
  const request = await Request.findByPk(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demande introuvable' });
  if (request.createdBy !== req.user.id) return res.status(403).json({ message: 'Non autorise' });
  if (request.status !== 'draft') return res.status(400).json({ message: 'Seules les demandes en brouillon peuvent etre modifiees' });

  if (workflowType) {
    const workflow = await WorkflowDefinition.findOne({ where: { name: workflowType } });
    if (!workflow) return res.status(400).json({ message: 'Workflow inconnu' });
    request.workflowType = workflowType;
  }

  request.data = data || {};
  await request.save();
  return res.json(request);
};

const getRequests = async (req, res) => {
  let where = {};
  if (req.user.role !== 'ADMIN') {
    // Any non-admin can be requester and/or validator.
    where = {
      [Op.or]: [
        { createdBy: req.user.id },
        { assignedTo: req.user.id },
      ],
    };
  }
  const requests = await Request.findAll({ where, include: ['creator', 'assignee'] });
  res.json(requests);
};

const getRequestById = async (req, res) => {
  const request = await Request.findByPk(req.params.id, { include: ['creator', 'assignee'] });
  if (!request) return res.status(404).json({ message: 'Demande introuvable' });

  const history = Array.isArray(request.history) ? request.history : [];
  const actorIds = [...new Set(
    history
      .map((entry) => Number(entry?.actor))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];

  let actorNameById = {};
  if (actorIds.length) {
    const actors = await User.findAll({
      where: { id: actorIds },
      attributes: ['id', 'fullName'],
    });
    actorNameById = actors.reduce((acc, actor) => {
      acc[actor.id] = actor.fullName;
      return acc;
    }, {});
  }

  const enrichedHistory = history.map((entry) => ({
    ...entry,
    actorName: entry?.actorName || actorNameById[Number(entry?.actor)] || null,
  }));

  res.json({
    ...request.toJSON(),
    history: enrichedHistory,
  });
};

const takeAction = async (req, res) => {
  const { action, comment, formData, attachments } = req.body;
  const request = await transitionRequest(req.params.id, action, req.user.id, comment, { formData, attachments });
  res.json(request);
};

const deleteRequest = async (req, res) => {
  const request = await Request.findByPk(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demande introuvable' });

  const isOwner = Number(request.createdBy) === Number(req.user.id);
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Non autorise' });
  }

  await request.destroy();
  res.status(204).send();
};

const uploadAttachment = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier' });
  const fileUrl = `/uploads/${req.file.filename}`;
  if (req.params.id) {
    const request = await Request.findByPk(req.params.id);
    if (request) {
      const attachments = [...request.attachments, fileUrl];
      await request.update({ attachments });
    }
  }
  res.json({ fileUrl });
};

module.exports = { createRequest, submitRequest, updateDraftRequest, getRequests, getRequestById, takeAction, deleteRequest, uploadAttachment };