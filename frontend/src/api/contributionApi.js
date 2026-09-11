import axiosClient from './axiosClient';

export const contributionApi = {
  getContributions: (params = {}) => {
    return axiosClient.get('/contributions', { params });
  },
  getContributionById: (id) => {
    return axiosClient.get(`/contributions/${id}`);
  },
  getTypes: () => {
    return axiosClient.get('/contributions/types');
  },
  createContribution: (data) => {
    return axiosClient.post('/contributions', data);
  },
  updateContribution: (id, data) => {
    return axiosClient.put(`/contributions/${id}`, data);
  },
  cancelContribution: (id, reason) => {
    return axiosClient.put(`/contributions/${id}/cancel`, { reason });
  },
  exportContributions: (params = {}, format = 'csv') => {
    return axiosClient.get('/contributions/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
  },
};
