import axiosClient from './axiosClient';

export const variApi = {
  getVariPayments: (params = {}) => {
    return axiosClient.get('/vari', { params });
  },
  getVariSummary: (params = {}) => {
    return axiosClient.get('/vari/summary', { params });
  },
  getVariRoster: (params = {}) => {
    return axiosClient.get('/vari/roster', { params });
  },
  createVariPayment: (data) => {
    return axiosClient.post('/vari', data);
  },
  updateVariPayment: (id, data) => {
    return axiosClient.put(`/vari/${id}`, data);
  },
  updatePangaliTargetVari: (pangaliId, annualVariAmount) => {
    return axiosClient.put(`/vari/target/${pangaliId}`, { annualVariAmount });
  },
  updatePangaliPendingVari: (pangaliId, pendingAmount) => {
    return axiosClient.put(`/vari/pending/${pangaliId}`, { pendingAmount });
  },
  cancelVariPayment: (id, reason) => {
    return axiosClient.put(`/vari/${id}/cancel`, { reason });
  },
  updateVariRosterItem: (pangaliId, data) => {
    return axiosClient.put(`/vari/roster/${pangaliId}`, data);
  },
  deleteVariRosterItem: (pangaliId, params = {}) => {
    return axiosClient.delete(`/vari/roster/${pangaliId}`, { params });
  },
};
