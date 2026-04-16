const { Op } = require('sequelize');
const { User } = require('../models');

const DEPARTMENT_ALIASES = {
  FINANCE: ['finance', 'direction financiere', 'financier', 'comptabilite'],
  COMMERCIAL: ['commercial', 'direction commerciale', 'vente'],
  RH: ['rh', 'ressources humaines', 'direction rh'],
  SI: ['si', 'it', 'informatique', 'direction si', 'dsi'],
  INVESTISSEMENT: ['investissement', 'direction investissement'],
  RECOUVREMENT: ['recouvrement', 'service recouvrement'],
  FISCAL: ['fiscal', 'service fiscal'],
  DIRECTION_GENERALE: ['direction generale', 'dg'],
};

const ROLE_PRIORITY_BY_DEPARTMENT = {
  FINANCE: ['DCF', 'DIRECTEUR_CG', 'CFO_GROUPE', 'DG'],
  COMMERCIAL: ['DCC', 'DCU_SF', 'DCU_SK', 'DG'],
  RH: ['DCRH', 'DG'],
  SI: ['DSI', 'DG'],
  INVESTISSEMENT: ['DIRECTEUR_INVESTISSEMENT', 'DCU_SF', 'DCU_SK', 'HOF_MARKETING', 'HOF_PRODUCTION', 'HOF_IT', 'DIRECTEUR_CG', 'CFO_GROUPE', 'DG'],
  RECOUVREMENT: ['SERVICE_RECOUVREMENT', 'DCC', 'DIRECTEUR_CG', 'DCF', 'DG'],
  FISCAL: ['SERVICE_FISCAL', 'DIRECTEUR_CG', 'DCF', 'DG'],
  DIRECTION_GENERALE: ['DG'],
};

const normalizeText = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeDepartment = (department) => {
  const normalizedInput = normalizeText(department);
  if (!normalizedInput) return '';

  for (const [key, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (aliases.some((alias) => normalizedInput.includes(alias))) {
      return key;
    }
  }

  return normalizedInput.toUpperCase();
};

const sortCandidates = (candidates, departmentKey) => {
  const rolePriority = ROLE_PRIORITY_BY_DEPARTMENT[departmentKey] || [];
  return [...candidates].sort((a, b) => {
    if (a.hierarchyLevel !== b.hierarchyLevel) {
      return a.hierarchyLevel - b.hierarchyLevel;
    }

    const aIndex = rolePriority.indexOf(a.role);
    const bIndex = rolePriority.indexOf(b.role);
    const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aRank - bRank;
  });
};

const findManagerForProfile = async ({ department, hierarchyLevel, excludeUserIds = [] }) => {
  const departmentKey = normalizeDepartment(department);
  if (!departmentKey || hierarchyLevel === undefined || hierarchyLevel === null) return null;

  const candidates = await User.findAll({
    where: {
      isActive: true,
      hierarchyLevel: { [Op.gt]: Number(hierarchyLevel) },
      id: { [Op.notIn]: excludeUserIds },
    },
  });

  const sameDepartment = candidates.filter(
    (candidate) => normalizeDepartment(candidate.department) === departmentKey
  );

  if (!sameDepartment.length) return null;
  return sortCandidates(sameDepartment, departmentKey)[0] || null;
};

const resolveHierarchyForUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return { nPlus1: null, nPlus2: null };

  // Prefer explicit org-chart assignment when available.
  let nPlus1 = null;
  if (user.managerId) {
    const directManager = await User.findByPk(user.managerId);
    if (directManager?.isActive) {
      nPlus1 = directManager;
    }
  }

  // Fallback to automatic same-department hierarchy resolution.
  if (!nPlus1) {
    nPlus1 = await findManagerForProfile({
      department: user.department,
      hierarchyLevel: user.hierarchyLevel,
      excludeUserIds: [user.id],
    });
  }

  const nPlus2 = nPlus1
    ? (
      nPlus1.managerId
        ? await User.findByPk(nPlus1.managerId)
        : await findManagerForProfile({
            department: user.department,
            hierarchyLevel: nPlus1.hierarchyLevel,
            excludeUserIds: [user.id, nPlus1.id],
          })
    )
    : null;

  return {
    nPlus1,
    nPlus2: nPlus2?.isActive ? nPlus2 : null,
  };
};

module.exports = {
  normalizeDepartment,
  findManagerForProfile,
  resolveHierarchyForUser,
};
