import axiosClient from './axiosClient';

export const dashboardApi = {
  getSummary: () => {
    return axiosClient.get('/dashboard/summary');
  },
};
