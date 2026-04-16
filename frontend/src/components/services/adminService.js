import api from './api';

export const getUsers = async (filters = {}) => {
  const response = await api.get('/admin/users', { params: filters });
  return response.data;
};

export const activateUser = async (userId, payload = {}) => {
  const response = await api.put(`/admin/users/${userId}/activate`, payload);
  return response.data;
};

export const rejectUser = async (userId, reason) => {
  const response = await api.put(`/admin/users/${userId}/reject`, { reason });
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await api.put(`/admin/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const getOrgChart = async () => {
  const response = await api.get('/admin/orgchart');
  return response.data;
};

export const updateOrgChart = async (userId, managerId) => {
  const response = await api.put('/admin/orgchart', { userId, managerId });
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};