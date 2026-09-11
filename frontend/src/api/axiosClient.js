import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('templeFinanceToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap data & handle 401
axiosClient.interceptors.response.use(
  (response) => {
    // Return standard backend envelope
    return response.data;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('templeFinanceToken');
        localStorage.removeItem('templeFinanceUser');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      const apiErrorData = error.response.data || {};
      const customError = new Error(apiErrorData.message || 'An error occurred during request execution.');
      customError.details = apiErrorData.details || [];
      customError.status = error.response.status;
      return Promise.reject(customError);
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
