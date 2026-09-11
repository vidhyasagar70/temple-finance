import axiosClient from './axiosClient';

export const userApi = {
  getUsers: () => {
    return axiosClient.get('/users');
  },
  createUser: (data) => {
    return axiosClient.post('/users', data);
  },
  updateUser: (id, data) => {
    return axiosClient.put(`/users/${id}`, data);
  },
};
