import axiosClient from './axiosClient';

export const donationApi = {
  getDonations: (params = {}) => {
    return axiosClient.get('/donations', { params });
  },
  getDonationSummary: () => {
    return axiosClient.get('/donations/summary');
  },
  createDonation: (data) => {
    return axiosClient.post('/donations', data);
  },
  updateDonation: (id, data) => {
    return axiosClient.put(`/donations/${id}`, data);
  },
  cancelDonation: (id, reason) => {
    return axiosClient.put(`/donations/${id}/cancel`, { reason });
  },
  deleteDonation: (id) => {
    return axiosClient.delete(`/donations/${id}`);
  },
};
