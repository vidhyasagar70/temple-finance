import axiosClient from './axiosClient';

export const authApi = {
  login: (phone, password) => {
    return axiosClient.post('/auth/login', { phone, password });
  },
  getMe: () => {
    return axiosClient.get('/auth/me');
  },
};
