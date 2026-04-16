const { User, Request, WorkflowDefinition } = require('../models');
const { sendAccountActivated } = require('../services/emailService');
const { findManagerForProfile } = require('../services/hierarchyService');

const recomputeDepartmentHierarchy = async (department) => {
  if (!department) return;

  const users = await User.findAll({
    where: { department, isActive: true },
    order: [['hierarchyLevel', 'ASC'], ['id', 'ASC']],
  });

  for (const currentUser of users) {
    const manager = await findManagerForProfile({
      department: currentUser.department,
      hierarchyLevel: currentUser.hierarchyLevel,
      excludeUserIds: [currentUser.id],
    });

    const nextManagerId = manager ? manager.id : null;
    if (currentUser.managerId !== nextManagerId) {
      await currentUser.update({ managerId: nextManagerId });
    }
  }
};

const getUsers = async (req, res) => {
  const { role, isActive, registrationStatus } = req.query;
  let where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (registrationStatus) where.registrationStatus = registrationStatus;
  const users = await User.findAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']],
  });
  res.json(users);
};

const activateUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  const { role, department, hierarchyLevel } = req.body || {};
  if (role) user.role = role;
  if (department) user.department = department;
  if (hierarchyLevel !== undefined) user.hierarchyLevel = Number(hierarchyLevel);

  // Automatically assign manager according to same-department hierarchy.
  const manager = await findManagerForProfile({
    department: user.department,
    hierarchyLevel: user.hierarchyLevel,
    excludeUserIds: [user.id],
  });
  user.managerId = manager ? manager.id : null;
  user.isActive = true;
  user.registrationStatus = 'approved';
  await user.save();
  await recomputeDepartmentHierarchy(user.department);
  await sendAccountActivated(user.email, user.fullName);
  const refreshedUser = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
  res.json({ message: 'Utilisateur activé', user: refreshedUser });
};

const rejectUser = async (req, res) => {
  const { reason } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  user.registrationStatus = 'rejected';
  user.rejectedReason = reason;
  user.isActive = false;
  await user.save();
  res.json({ message: 'Utilisateur refusé' });
};

const updateUser = async (req, res) => {
  const { role, department, hierarchyLevel, managerId } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  const previousDepartment = user.department;

  const nextRole = role ?? user.role;
  const nextDepartment = department ?? user.department;
  const nextHierarchyLevel = hierarchyLevel ?? user.hierarchyLevel;

  const resolvedManagerId = managerId !== undefined
    ? managerId
    : (await findManagerForProfile({
        department: nextDepartment,
        hierarchyLevel: nextHierarchyLevel,
        excludeUserIds: [user.id],
      }))?.id || null;

  await user.update({
    role: nextRole,
    department: nextDepartment,
    hierarchyLevel: nextHierarchyLevel,
    managerId: resolvedManagerId,
  });
  await recomputeDepartmentHierarchy(nextDepartment);
  if (previousDepartment !== nextDepartment) {
    await recomputeDepartmentHierarchy(previousDepartment);
  }
  const refreshedUser = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
  res.json(refreshedUser);
};

const deleteUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  // Reassign or clear subordinates first to satisfy FK(managerId -> users.id).
  const subordinates = await User.findAll({ where: { managerId: user.id } });
  for (const subordinate of subordinates) {
    const manager = await findManagerForProfile({
      department: subordinate.department,
      hierarchyLevel: subordinate.hierarchyLevel,
      excludeUserIds: [subordinate.id, user.id],
    });
    await subordinate.update({ managerId: manager ? manager.id : null });
  }

  await user.destroy();
  await recomputeDepartmentHierarchy(user.department);
  res.json({ message: 'Utilisateur supprimé' });
};

const getOrgChart = async (req, res) => {
  const users = await User.findAll({ where: { isActive: true }, attributes: ['id', 'fullName', 'role', 'department', 'hierarchyLevel', 'managerId'] });
  res.json(users);
};

const updateOrgChart = async (req, res) => {
  const { userId, managerId } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  user.managerId = managerId;
  await user.save();
  res.json({ message: 'Organigramme mis à jour' });
};

const getStats = async (req, res) => {
  const { Op } = require('sequelize');
  const totalUsers = await User.count();
  const activeUsers = await User.count({ where: { isActive: true } });
  const pendingRequests = await Request.count({ where: { status: 'pending' } });
  const inProgressOnly = await Request.count({ where: { status: 'in_progress' } });
  const returnedRequests = await Request.count({ where: { status: 'returned' } });
  const draftRequests = await Request.count({ where: { status: 'draft' } });
  const approvedRequests = await Request.count({ where: { status: 'approved' } });
  const rejectedRequests = await Request.count({ where: { status: 'rejected' } });
  const completedRequests = await Request.count({ where: { status: { [Op.in]: ['approved', 'rejected'] } } });
  const inProgressRequests = inProgressOnly + pendingRequests + returnedRequests;
  const totalRequests = await Request.count();

  res.json({
    totalUsers,
    activeUsers,
    totalRequests,
    draftRequests,
    pendingRequests,
    inProgressOnly,
    returnedRequests,
    inProgressRequests,
    approvedRequests,
    rejectedRequests,
    completedRequests,
  });
};

module.exports = { getUsers, activateUser, rejectUser, updateUser, deleteUser, getOrgChart, updateOrgChart, getStats };