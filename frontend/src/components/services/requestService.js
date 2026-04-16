import api from './api';

export const getRequests = async () => {
  const response = await api.get('/requests');
  return response.data;
};

export const getRequestById = async (id) => {
  const response = await api.get(`/requests/${id}`);
  return response.data;
};

export const createRequest = async (data) => {
  const response = await api.post('/requests', data);
  return response.data;
};

export const submitRequest = async (id) => {
  const response = await api.post(`/requests/${id}/submit`);
  return response.data;
};

export const updateDraftRequest = async (id, data) => {
  const response = await api.put(`/requests/${id}/draft`, data);
  return response.data;
};

export const takeAction = async (id, action, comment, formData) => {
  const response = await api.post(`/requests/${id}/action`, { action, comment, formData });
  return response.data;
};

export const uploadAttachment = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/requests/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteRequest = async (id) => {
  await api.delete(`/requests/${id}`);
};