// JWT and Auth Management Module
const auth = {
    // Token Management
    setToken: (token) => {
        localStorage.setItem('mki_token', token);
    },

    getToken: () => {
        return localStorage.getItem('mki_token');
    },

    // User Data Management
    setUser: (user) => {
        localStorage.setItem('mki_user', JSON.stringify(user));
    },

    getUser: () => {
        const userStr = localStorage.getItem('mki_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Failed to parse user data from localStorage', e);
            return null;
        }
    },

    // Token Validation
    isTokenValid: () => {
        return !!auth.getToken() && !!auth.getUser();
    },

    // Get Headers with Authorization
    getAuthHeaders: () => {
        const token = auth.getToken();
        if (!token) {
            auth.logout();
            return null;
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    // Logout & Clear Session
    logout: () => {
        localStorage.removeItem('mki_token');
        localStorage.removeItem('mki_user');
        window.location.href = '/';
    },

    // Role-Based Access Control
    requireRole: (expectedRole) => {
        const user = auth.getUser();
        const token = auth.getToken();

        if (!token || !user) {
            auth.logout();
            return false;
        }

        if (user.role !== expectedRole) {
            // Redirect based on actual role
            if (user.role === 'partner') {
                window.location.href = '/store.html';
            } else if (user.role === 'admin') {
                window.location.href = '/store.html';
            } else {
                auth.logout();
            }
            return false;
        }

        return true;
    }
};

export default auth;
