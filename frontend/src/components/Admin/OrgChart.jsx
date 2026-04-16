import React, { useEffect, useMemo, useState } from 'react';
import { getOrgChart, updateOrgChart } from '../services/adminService';
import { toast } from 'react-toastify';

const OrgChart = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const managerChoicesByUser = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = users.filter((candidate) => {
        if (candidate.id === user.id) return false;
        if (candidate.department !== user.department) return false;
        return Number(candidate.hierarchyLevel) < Number(user.hierarchyLevel);
      });
    });
    return map;
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

  const handleManagerChange = async (userId, managerId) => {
    try {
      await updateOrgChart(userId, managerId ? Number(managerId) : null);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, managerId: managerId ? Number(managerId) : null } : user))
      );
      toast.success('Organigramme mis à jour');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Organigramme</h1>
      <div className="card">
        {loading ? (
          <p>Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">Aucun utilisateur actif.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Département</th>
                  <th className="text-left py-2">Rôle</th>
                  <th className="text-left py-2">Niveau</th>
                  <th className="text-left py-2">Manager</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.fullName}</td>
                    <td>{user.department}</td>
                    <td>{user.role}</td>
                    <td>{user.hierarchyLevel}</td>
                    <td>
                      <select
                        value={user.managerId || ''}
                        onChange={(e) => handleManagerChange(user.id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">Aucun</option>
                        {managerChoicesByUser[user.id]?.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.fullName} ({candidate.role})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgChart;
