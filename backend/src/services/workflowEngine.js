const { User, Request, WorkflowDefinition, Notification } = require('../models');
const emailService = require('./emailService');
const pdfService = require('./pdfService');
const { resolveHierarchyForUser } = require('./hierarchyService');

const ROLE_ALIASES = {
  IT: 'HOF_IT',
};

const normalizeRole = (role) => {
  if (!role) return role;
  const normalized = String(role).trim().toUpperCase();
  return ROLE_ALIASES[normalized] || normalized;
};

const resolveHierarchy = async (userId) => {
  return resolveHierarchyForUser(userId);
};

const getTargetUser = async (step, request, contextUserId) => {
  if (step.actorType === 'role') {
    const normalizedRole = normalizeRole(step.actorValue);
    const user = await User.findOne({ where: { role: normalizedRole, isActive: true } });
    return user;
  } else if (step.actorType === 'hierarchy') {
    const nPlus1 = request.resolvedNPlus1 ? await User.findByPk(request.resolvedNPlus1) : null;
    const nPlus2 = request.resolvedNPlus2 ? await User.findByPk(request.resolvedNPlus2) : null;
    if (step.actorValue === 'N+1') return nPlus1;
    if (step.actorValue === 'N+2') return nPlus2;
    if (step.actorValue === 'N') return await User.findByPk(request.createdBy);
  } else if (step.actorType === 'specificUser') {
    return await User.findByPk(step.actorValue);
  }
  return null;
};

const evaluateConditions = (step, requestData) => {
  if (!step.conditions || step.conditions.length === 0) return null;

  const toComparableValues = (left, right) => {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
    if (bothNumeric) return [leftNumber, rightNumber];
    return [left, right];
  };

  for (const cond of step.conditions) {
    const fieldValue = requestData?.[cond.field];
    const [left, right] = toComparableValues(fieldValue, cond.value);
    let satisfied = false;
    switch (cond.operator) {
      case '>': satisfied = left > right; break;
      case '<': satisfied = left < right; break;
      case '>=': satisfied = left >= right; break;
      case '<=': satisfied = left <= right; break;
      case '==': satisfied = left == right; break;
      case '!=': satisfied = left != right; break;
      default: break;
    }
    if (satisfied) return cond.nextStepIndex;
  }
  return null;
};

const getMissingRequiredFields = (step, requestData) => {
  const requiredFields = Array.isArray(step?.requiredFields) ? step.requiredFields : [];
  return requiredFields.filter((fieldName) => {
    const value = requestData?.[fieldName];
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });
};

const transitionRequest = async (requestId, action, userId, comment, additionalData = {}) => {
  const request = await Request.findByPk(requestId, { include: [{ model: User, as: 'creator' }] });
  if (!request) throw new Error('Demande introuvable');
  const actorUser = await User.findByPk(userId);

  const workflow = await WorkflowDefinition.findOne({ where: { name: request.workflowType } });
  if (!workflow) throw new Error('Workflow non défini');

  const steps = workflow.steps;
  const currentStep = steps[request.currentStepIndex];
  if (!currentStep) throw new Error('Étape invalide');

  if (request.assignedTo && Number(request.assignedTo) !== Number(userId)) {
    throw new Error('Seul l acteur assigne peut traiter cette etape');
  }

  if (!currentStep.actions.includes(action)) {
    throw new Error(`Action ${action} non autorisée pour cette étape`);
  }

  // Historique
  const historyEntry = {
    stepName: currentStep.name,
    actor: userId,
    actorName: actorUser?.fullName || null,
    action,
    comment,
    attachments: additionalData.attachments || [],
    timestamp: new Date(),
  };
  const history = [...request.history, historyEntry];

  // Mise à jour des données
  let newData = request.data;
  if (additionalData.formData) {
    newData = { ...request.data, ...additionalData.formData };
  }

  let nextStepIndex = null;
  let finalStatus = request.status;

  if (action === 'validate') {
    const missingFields = getMissingRequiredFields(currentStep, newData);
    if (missingFields.length > 0) {
      throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
    }

    const conditionalNext = evaluateConditions(currentStep, newData);
    if (conditionalNext !== null) {
      nextStepIndex = conditionalNext;
    } else {
      nextStepIndex = request.currentStepIndex + 1;
    }

    if (nextStepIndex >= steps.length) {
      finalStatus = 'approved';
      // Génération PDF
      const pdfPath = await pdfService.generateRequestPDF(request, request.creator, workflow, {
        history,
        data: newData,
        status: 'approved',
      });
      // Notification à tous les participants
      const participantIds = [...new Set(history.map(h => h.actor).filter(Boolean))];
      for (const pid of participantIds) {
        const user = await User.findByPk(pid);
        if (user) await emailService.sendFinalPDF(user.email, request.reference, null);
      }
      await request.update({ status: 'approved', finalPdfUrl: pdfPath, history, data: newData });
      return request;
    } else {
      finalStatus = 'in_progress';
    }
  } else if (action === 'reject' || action === 'return') {
    // Rule agreed with business: refusal returns to previous step.
    nextStepIndex = Math.max(0, request.currentStepIndex - 1);
    finalStatus = nextStepIndex === 0 ? 'returned' : 'in_progress';

    // Notify requester with the refusal/return note.
    if (request.creator?.email) {
      await emailService.sendRejection(request.creator.email, request.reference, comment || 'Aucun commentaire');
    }
    await Notification.create({
      userId: request.createdBy,
      requestId: request.id,
      type: 'inapp',
      title: `Demande ${action === 'reject' ? 'refusée' : 'retournée'} - ${request.reference}`,
      message: comment || 'Aucun commentaire',
      metadata: { requestId: request.id, action, comment },
    });
  } else if (action === 'modify') {
    nextStepIndex = request.currentStepIndex;
  }

  // Assigner le prochain acteur
  let nextActor = null;
  if (nextStepIndex !== null && nextStepIndex < steps.length) {
    const nextStep = steps[nextStepIndex];
    nextActor = await getTargetUser(nextStep, request, request.createdBy);
    if (!nextActor) {
      throw new Error(
        `Aucun acteur actif trouvé pour l étape "${nextStep.name}" (${nextStep.actorType}:${nextStep.actorValue})`
      );
    }
    if (nextActor) {
      await emailService.sendStepNotification(
        nextActor.email,
        request.reference,
        nextStep.name,
        `${process.env.FRONTEND_URL}/requests/${request.id}`,
        comment || ''
      );
      await Notification.create({
        userId: nextActor.id,
        requestId: request.id,
        type: 'inapp',
        title: `Nouvelle action requise - ${request.reference}`,
        message: comment
          ? `Demande ${request.reference} en attente de ${nextStep.name}. Note: ${comment}`
          : `Demande ${request.reference} en attente de ${nextStep.name}`,
        metadata: { requestId: request.id, actionUrl: `/requests/${request.id}`, previousComment: comment || '' },
      });
    }
  }

  await request.update({
    currentStepIndex: nextStepIndex !== null ? nextStepIndex : request.currentStepIndex,
    status: finalStatus,
    assignedTo: nextActor ? nextActor.id : null,
    history,
    data: newData,
  });

  return request;
};

module.exports = { resolveHierarchy, transitionRequest, getTargetUser };