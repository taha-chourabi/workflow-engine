import api from './api';

export const getWorkflows = async () => {
  const response = await api.get('/workflows');
  return response.data;
};

export const getWorkflowByName = async (name) => {
  const response = await api.get(`/workflows/${name}`);
  return response.data;
};

export const createWorkflow = async (data) => {
  const response = await api.post('/workflows', data);
  return response.data;
};

export const updateWorkflow = async (id, data) => {
  const response = await api.put(`/workflows/${id}`, data);
  return response.data;
};