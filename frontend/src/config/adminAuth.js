/**
 * Admin web dashboard login.
 * Override with Vite env: VITE_ADMIN_USERNAME, VITE_ADMIN_PASSWORD (e.g. in .env.local)
 */
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'SmartLogix@2026';

export function getExpectedCredentials() {
    return {
        username: import.meta.env.VITE_ADMIN_USERNAME || DEFAULT_USERNAME,
        password: import.meta.env.VITE_ADMIN_PASSWORD || DEFAULT_PASSWORD,
    };
}

export function validateAdminCredentials(username, password) {
    const { username: u, password: p } = getExpectedCredentials();
    return username === u && password === p;
}
