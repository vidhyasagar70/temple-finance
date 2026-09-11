import axiosClient from './axiosClient';

export const fundApi = {
  getFundAdvances: (params = {}) => {
    return axiosClient.get('/fund-advances', { params });
  },
  getFundAdvance: (id) => {
    return axiosClient.get(`/fund-advances/${id}`);
  },
  createFundAdvance: (data) => {
    return axiosClient.post('/fund-advances', data);
  },
  recordRepayment: (id, data) => {
    return axiosClient.post(`/fund-advances/${id}/repayments`, data);
  },
  cancelFundAdvance: (id, reason) => {
    return axiosClient.put(`/fund-advances/${id}/cancel`, { reason });
  },
};
