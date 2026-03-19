import auth from './auth.js';

// Centralised Fetch wrapper
const api = {
    request: async (endpoint, method = 'GET', body = null) => {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`/api/v1${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle 401 globally by checking if token is expired
                if (response.status === 401) {
                    console.warn("Unauthorized/Token Expired");
                    auth.logout();
                }
                throw new Error(data.details || data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error on ${method} ${endpoint}:`, error);
            throw error;
        }
    },

    get: (endpoint) => api.request(endpoint, 'GET'),
    post: (endpoint, body) => api.request(endpoint, 'POST', body),
    put: (endpoint, body) => api.request(endpoint, 'PUT', body),
    patch: (endpoint, body) => api.request(endpoint, 'PATCH', body),
    delete: (endpoint) => api.request(endpoint, 'DELETE'),

    // External API requests without /api/v1 prefix
    externalRequest: async (url, method = 'GET', body = null) => {
        const headers = {
            'Content-Type': 'application/json'
        };

        const config = {
            method,
            headers
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`External API Error on ${method} ${url}:`, error);
            throw error;
        }
    },

    externalGet: (url) => api.externalRequest(url, 'GET'),
    externalPost: (url, body) => api.externalRequest(url, 'POST', body),

    // Bypass application/json explicitly for FormData
    upload: async (endpoint, formData) => {
        const token = auth.getToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Browser sets Content-Type boundary automatically for FormData

        try {
            const response = await fetch(`/api/v1${endpoint}`, {
                method: 'POST',
                headers,
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) auth.logout();
                throw new Error(data.details || data.error || 'Upload failed');
            }
            return data;
        } catch (error) {
            console.error(`Upload Error on ${endpoint}:`, error);
            throw error;
        }
    },

    // Fetch as BLOB and trigger browser download explicitly to pass standard Authorization Headers
    downloadBlob: async (endpoint, filename) => {
        const token = auth.getToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`/api/v1${endpoint}`, { method: 'GET', headers });

            if (!response.ok) {
                if (response.status === 401) auth.logout();
                let errMsg = 'Download failed';
                try { const data = await response.json(); errMsg = data.details || data.error; } catch (e) { }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            // Create in-memory URL mapping to Blob
            const url = window.URL.createObjectURL(blob);

            // Programmatically trigger an <a> download tag
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error(`Download Error on ${endpoint}:`, error);
            throw error;
        }
    }
};

export default api;
