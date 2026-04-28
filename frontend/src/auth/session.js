const AUTH_KEY = 'smartlogix_auth';

export function isAuthenticated() {
    return typeof window !== 'undefined' && localStorage.getItem(AUTH_KEY) === '1';
}

export function setAuthenticated() {
    localStorage.setItem(AUTH_KEY, '1');
}

export function clearSession() {
    localStorage.removeItem(AUTH_KEY);
}
