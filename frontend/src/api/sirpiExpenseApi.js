import axiosClient from './axiosClient';

export const sirpiExpenseApi = {
  getSirpiExpenses: (params = {}) => {
    return axiosClient.get('/sirpi-expenses', { params });
  },
  createSirpiExpense: (data) => {
    return axiosClient.post('/sirpi-expenses', data);
  },
  updateSirpiExpense: (id, data) => {
    return axiosClient.put(`/sirpi-expenses/${id}`, data);
  },
  cancelSirpiExpense: (id, reason) => {
    return axiosClient.put(`/sirpi-expenses/${id}/cancel`, { reason });
  },
};
