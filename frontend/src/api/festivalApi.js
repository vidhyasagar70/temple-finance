import axiosClient from './axiosClient';

export const festivalApi = {
  getFestivals: (params = {}) => {
    return axiosClient.get('/festivals', { params });
  },
  getFestivalSummary: (id) => {
    return axiosClient.get(`/festivals/${id}/summary`);
  },
  createFestival: (data) => {
    return axiosClient.post('/festivals', data);
  },
  updateFestival: (id, data) => {
    return axiosClient.put(`/festivals/${id}`, data);
  },
};
