import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🌐 API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response.data;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Interview-specific API calls
export const interviewAPI = {
  getEligibleCandidates: async (roundId) => {
    console.log('🔍 Getting eligible candidates for round:', roundId);
    return api.get(`/rounds/${roundId}/eligible-candidates`);
  },
  
  getInterviewers: async () => {
    console.log('🔍 Getting interviewers list');
    return api.get('/interviewers');
  },
  
  scheduleInterview: async (roundId, interviewData) => {
    console.log('📅 Scheduling interview for round:', roundId, interviewData);
    return api.post(`/rounds/${roundId}/schedule-interview`, interviewData);
  },
  
  submitFeedback: async (candidateRoundId, feedbackData) => {
    console.log('📝 Submitting feedback for candidate round:', candidateRoundId);
    return api.post(`/candidate-rounds/${candidateRoundId}/feedback`, feedbackData);
  }
};

export default api;