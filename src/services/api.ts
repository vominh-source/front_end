import axios, { AxiosResponse, AxiosError } from 'axios';
import { User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5173/api';
const API_KEY = 'secret_api_key'; // Fixed API key

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY, // Set fixed API key in headers
  },
});

// Response interceptor for comprehensive error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let message = 'An error occurred';
    
    if (error.response) {
      // API responded with error status
      const data = error.response.data as any;
      message = data?.message || data?.error || `HTTP ${error.response.status}: ${error.response.statusText}`;
      
      // Handle specific status codes
      if (error.response.status === 401) {
        message = 'Unauthorized access. Please check your credentials.';
      } else if (error.response.status === 403) {
        message = 'Access forbidden. Invalid API key.';
      } else if (error.response.status === 404) {
        message = 'Resource not found.';
      } else if (error.response.status === 500) {
        message = 'Internal server error. Please try again later.';
      }
    } else if (error.request) {
      // Network error
      message = 'Network error. Please check your internet connection and ensure the backend is running on localhost:3000.';
    } else {
      // Other error
      message = error.message || 'An unexpected error occurred';
    }
    
    // Log error for debugging
    console.error('API Error:', {
      message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    
    return Promise.reject(new Error(message));
  }
);

export const userService = {
  // GET /api/users/search?name=term - Search users (optional name parameter)
  searchUsers: async (name?: string): Promise<User[]> => {
    let url = '/users/search';
    
    if (name && name.trim()) {
      url += `?name=${encodeURIComponent(name.trim())}`;
    }
    
    const response: AxiosResponse<User[]> = await api.get(url);
    return response.data;
  },

  // POST /api/users/update - Update users (requires API key) 
  updateUser: async (userData: Partial<User> & { id?: number }): Promise<User> => {
    // Backend expects an array, so wrap single user in array
    const response: AxiosResponse<User[]> = await api.post('/users/update', [userData]);
    return response.data[0]; // Return first user from response array
  },

  // POST /api/users/update - Update multiple users (requires API key)
  updateUsers: async (usersData: (Partial<User> & { id?: number })[]): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.post('/users/update', usersData);
    return response.data;
  },
};

export default api;
