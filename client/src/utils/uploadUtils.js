import api from './api';
import { authUtils } from './authUtils';

export const uploadUtils = {
  // Upload a single resume
  uploadSingleResume: async (file, jobId, options = {}) => {
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobId", jobId);
      formData.append("uploadedBy", authUtils.getUserEmail());
      
      if (options.jd) {
        formData.append("jd", options.jd);
      }

      const response = await api.post("/resume/upload/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return {
        success: true,
        data: response.data,
        fileName: file.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Upload failed",
        fileName: file.name
      };
    }
  },

  // Upload multiple resumes
  uploadMultipleResumes: async (files, jobId, options = {}) => {
    const results = [];
    
    for (const file of files) {
      const result = await uploadUtils.uploadSingleResume(file, jobId, options);
      results.push(result);
    }
    
    return results;
  },

  // Check if Python backend is available
  checkPythonBackend: async () => {
    try {
      const response = await api.get('/health/python-backend');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}; 