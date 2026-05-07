import React, { useEffect, useMemo, useState } from 'react';
import { getOrgChart, updateOrgChart } from '../services/adminService';
import { toast } from 'react-toastify';

const OrgChart = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeText = (value) =>
    (value || '').toString().toLowerCase().trim();

  const managerNameByUser = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user.fullName;
      return acc;
    }, {});
  }, [users]);

  const departmentHierarchy = useMemo(() => {
    const nodes = {};
    users.forEach((user) => {
      nodes[user.id] = { ...user, children: [] };
    });

    const roots = {};
    users.forEach((user) => {
      const departmentKey = user.departmentKey || normalizeText(user.department) || 'sans_departement';
      if (!roots[departmentKey]) roots[departmentKey] = { label: user.department || 'Sans département', users: [] };
      const managerNode = user.effectiveManagerId ? nodes[user.effectiveManagerId] : null;

      if (managerNode && ((managerNode.departmentKey || normalizeText(managerNode.department)) === departmentKey)) {
        managerNode.children.push(nodes[user.id]);
      } else {
        roots[departmentKey].users.push(nodes[user.id]);
      }
    });

    Object.values(roots).forEach((group) => {
      group.users.sort((a, b) => Number(a.hierarchyLevel) - Number(b.hierarchyLevel));
    });

    return roots;
  }, [users]);

  const loadOrgChart = async () => {
    try {
      const data = await getOrgChart();
      const sorted = [...data].sort((a, b) => {
        if (a.department !== b.department) {
          return String(a.department).localeCompare(String(b.department));
        }
        if (Number(a.hierarchyLevel) !== Number(b.hierarchyLevel)) {
          return Number(a.hierarchyLevel) - Number(b.hierarchyLevel);
        }
        return String(a.fullName).localeCompare(String(b.fullName));
      });
      setUsers(sorted);
    } catch (error) {
      toast.error('Erreur lors du chargement de l organigramme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgChart();
  }, []);

  const renderUserNode = (user, level = 0) => (
    <div key={user.id} className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 ${level > 0 ? 'mt-4' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">{user.fullName}</p>
          <p className="text-sm text-gray-500 mt-1">{user.role || 'Rôle non défini'}</p>
        </div>
        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700 sm:mt-0">
          Niveau {user.hierarchyLevel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-gray-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <span className="font-medium text-gray-800">Manager :</span>{' '}
          {user.effectiveManagerId ? user.effectiveManagerName || managerNameByUser[user.effectiveManagerId] : 'Aucun'}
        </div>
        {user.email && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="font-medium text-gray-800">Email :</span>{' '}
            {user.email}
          </div>
        )}
      </div>

      {user.children.length > 0 && (
        <div className="mt-6 border-l border-slate-200 pl-5">
          {user.children.map((child) => renderUserNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Organigramme</h1>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm text-center text-gray-600">
            Chargement...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            Aucun utilisateur actif.
          </div>
        ) : (
          Object.entries(departmentHierarchy).map(([departmentKey, group]) => (
            <div key={departmentKey} className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-blue-900">{group.label}</h2>
              </div>
              <div className="space-y-6 p-6">
                {group.users.map((user) => renderUserNode(user))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrgChart;
