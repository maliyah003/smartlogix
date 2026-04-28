import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
    // 1. Explicit environment variable priority
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
    if (configuredUrl) return configuredUrl;

    const configuredPort = process.env.EXPO_PUBLIC_API_PORT || '5001';
    
    // 2. Try various Expo manifest versions for hostUri
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.experienceLoaderConfig?.hostUri;

    if (hostUri) {
        // Strip the port and query params from hostUri if present
        const host = hostUri.split(':')[0];
        console.log(`[API] Resolved host from Expo: ${host}`);
        return `http://${host}:${configuredPort}`;
    }

    // 3. Platform-specific fallbacks (emulators)
    if (Platform.OS === 'android') {
        console.log(`[API] Using Android emulator loopback: 10.0.2.2:${configuredPort}`);
        return `http://10.0.2.2:${configuredPort}`;
    }

    console.log(`[API] Defaulting to localhost:${configuredPort}`);
    return `http://localhost:${configuredPort}`;
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Automatically inject JWT token into all requests
api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('driverToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {
        console.error('Error fetching token from storage', e);
    }
    return config;
});

export const authAPI = {
    checkStatus: (email) => api.post('/api/drivers/check-status', { email }),
    login: (email, password) => api.post('/api/drivers/login', { email, password }),
};

export const driverAPI = {
    getMonthlyScore: (driverId, params = {}) => api.get(`/api/drivers/${driverId}/score`, { params })
};

export const tripAPI = {
    getDriverTrips: (driverId) => api.get(`/api/trips/driver/${driverId}`),
    updateTripStatus: (tripId, status) => api.patch(`/api/trips/${tripId}/status`, { status }),
    updatePosition: (tripId, longitude, latitude) => api.post(`/api/trips/${tripId}/position`, { longitude, latitude }),
    refuseTrip: (tripId, reason) => api.post(`/api/trips/${tripId}/refuse`, { reason }),
    saveProofOfDelivery: (tripId, payload) =>
        api.patch(`/api/proof-of-delivery/trip/${tripId}`, payload),
};

export const jobAPI = {
    getJobById: (jobId) => api.get(`/api/jobs/${jobId}`)
};

export const notificationAPI = {
    getDriverNotifications: (driverId) => api.get(`/api/notifications?driverId=${driverId}`),
    markAsRead: (id) => api.patch(`/api/notifications/${id}/read`),
};

export const tripCostAPI = {
    getTripCost: (tripId) => api.get(`/api/trip-costs/${tripId}`),
    startTripCost: (tripId, driverId, startOdometer) => api.post('/api/trip-costs/start', { tripId, driverId, startOdometer }),
    saveDraft: (tripId, data) => api.post('/api/trip-costs/draft', { tripId, ...data }),
    resetDraft: (tripId) => api.delete(`/api/trip-costs/${tripId}/draft`),
    finalizeTripCost: (tripId, data) => api.post('/api/trip-costs/finalize', { tripId, ...data })
};
