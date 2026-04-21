import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Vehicle API
export const vehicleAPI = {
    getAll: () => api.get('/vehicles'),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (data) => api.post('/vehicles', data),
    update: (id, data) => api.put(`/vehicles/${id}`, data),
    delete: (id) => api.delete(`/vehicles/${id}`),
    updateLocation: (id, location) => api.patch(`/vehicles/${id}/location`, { location }),
    updateStatus: (id, status) => api.patch(`/vehicles/${id}/status`, { status }),
    getMaintenanceLogs: (id) => api.get(`/vehicles/${id}/maintenance`),
    getRecentMaintenanceLogs: () => api.get('/vehicles/maintenance/recent')
};

// Job API
export const jobAPI = {
    bookJob: (data) => api.post('/jobs/book', data),
    getBackhauls: (params) => api.get('/jobs/backhaul', { params }),
    matchVehicles: (data) => api.post('/jobs/match', data),
    getById: (id) => api.get(`/jobs/${id}`),
    getAll: (params) => api.get('/jobs', { params })
};

// Trip API
export const tripAPI = {
    getAllTrips: () => api.get('/trips'),
    getById: (id) => api.get(`/trips/${id}`),
    delete: (tripId) => api.delete(`/trips/${tripId}`),
    updateStatus: (id, status) => api.patch(`/trips/${id}/status`, { status }),
    updatePosition: (id, longitude, latitude) => api.post(`/trips/${id}/position`, { longitude, latitude }),
    approveRefusal: (tripId, data) => api.post(`/trips/${tripId}/refuse/approve`, data),
    rejectRefusal: (tripId) => api.post(`/trips/${tripId}/refuse/reject`),
};

// Driver API
export const driverAPI = {
    getAll: () => api.get('/drivers'),
    getAvailable: (params = {}) => api.get('/drivers/available', { params }),
    getById: (id) => api.get(`/drivers/${id}`),
    create: (data) => api.post('/drivers', data),
    update: (id, data) => api.put(`/drivers/${id}`, data),
    delete: (id) => api.delete(`/drivers/${id}`),
    getScore: (id, params = {}) => api.get(`/drivers/${id}/score`, { params }),
    addIncident: (id, data) => api.post(`/drivers/${id}/incidents`, data),
    getIncidents: (id, params = {}) => api.get(`/drivers/${id}/incidents`, { params })
};

export const notificationAPI = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const tripCostAPI = {
    getSummary: () => api.get('/trip-costs/summary'),
};

export const proofOfDeliveryAPI = {
    getAll: (params = {}) => api.get('/proof-of-delivery', { params }),
    getByTripId: (tripId) => api.get(`/proof-of-delivery/trip/${tripId}`)
};

export default api;
