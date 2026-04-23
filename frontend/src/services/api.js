import axios from 'axios';

// ── Base instances for each microservice ──────────────────────────────────────
const makeClient = (baseURL) => {
  const client = axios.create({ baseURL, timeout: 10000 });

  // Attach JWT from localStorage
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-refresh on 401
  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return client(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const authApi      = makeClient('/api/auth');
export const userApi      = makeClient('/api/users');
export const trainingApi  = makeClient('/api/trainings');
export const attendanceApi = makeClient('/api/attendance');

// ── Auth endpoints ─────────────────────────────────────────────────────────────
export const authService = {
  login:          (data) => authApi.post('/login', data),
  register:       (data) => authApi.post('/register', data),
  logout:         (userId) => authApi.post('/logout', { userId }),
  changePassword: (data) => authApi.put('/change-password', data),
};

// ── User endpoints ─────────────────────────────────────────────────────────────
export const userService = {
  getAll:   (params) => userApi.get('/', { params }),
  getById:  (userId) => userApi.get(`/${userId}`),
  getMe:    ()       => userApi.get('/me'),
  create:   (data)   => userApi.post('/', data),
  update:   (userId, data) => userApi.put(`/${userId}`, data),
  deactivate: (userId)    => userApi.delete(`/${userId}`),
};

// ── Training endpoints ─────────────────────────────────────────────────────────
export const trainingService = {
  getAll:    (params) => trainingApi.get('/', { params }),
  getById:   (id)     => trainingApi.get(`/${id}`),
  create:    (data)   => trainingApi.post('/', data),
  update:    (id, data) => trainingApi.put(`/${id}`, data),
  cancel:    (id)     => trainingApi.delete(`/${id}`),
  enroll:    (id, data) => trainingApi.post(`/${id}/enroll`, data),
  unenroll:  (id, data) => trainingApi.post(`/${id}/unenroll`, data),
};

// ── Attendance endpoints ───────────────────────────────────────────────────────
export const attendanceService = {
  mark:           (data) => attendanceApi.post('/', data),
  bulkMark:       (data) => attendanceApi.post('/bulk', data),
  getByTraining:  (id, params) => attendanceApi.get(`/training/${id}`, { params }),
  getSummary:     (id)         => attendanceApi.get(`/training/${id}/summary`),
  getByUser:      (userId, params) => attendanceApi.get(`/user/${userId}`, { params }),
  update:         (id, data)   => attendanceApi.put(`/${id}`, data),
};
