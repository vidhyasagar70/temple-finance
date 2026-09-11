import axiosClient from './axiosClient';

export const pangaliApi = {
  getPangalis: (params = {}) => {
    return axiosClient.get('/pangalis', { params });
  },
  getPangali: (id) => {
    return axiosClient.get(`/pangalis/${id}`);
  },
  getPangaliSummary: (id, financialYear = '') => {
    const params = financialYear ? { financialYear } : {};
    return axiosClient.get(`/pangalis/${id}/summary`, { params });
  },
  createPangali: (data) => {
    return axiosClient.post('/pangalis', data);
  },
  updatePangali: (id, data) => {
    return axiosClient.put(`/pangalis/${id}`, data);
  },
  deactivatePangali: (id) => {
    return axiosClient.put(`/pangalis/${id}/deactivate`);
  },
};
