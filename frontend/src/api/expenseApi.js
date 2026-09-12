import axiosClient from './axiosClient';

export const expenseApi = {
  getExpenses: (params = {}) => {
    return axiosClient.get('/expenses', { params });
  },
  getExpensesByDate: (params = {}) => {
    return axiosClient.get('/expenses/by-date', { params });
  },
  createExpense: (data) => {
    return axiosClient.post('/expenses', data);
  },
  updateExpense: (id, data) => {
    return axiosClient.put(`/expenses/${id}`, data);
  },
  cancelExpense: (id, reason) => {
    return axiosClient.put(`/expenses/${id}/cancel`, { reason });
  },
  deleteExpense: (id, reason) => {
    return axiosClient.delete(`/expenses/${id}`, { data: { reason } });
  },
};
