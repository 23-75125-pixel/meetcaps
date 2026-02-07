// Configuration for frontend
// Update this with your deployed backend server URL
const CONFIG = {
    SERVER_URL: (() => {
        // Try environment variable first
        if (typeof REACT_APP_SERVER_URL !== 'undefined') {
            return REACT_APP_SERVER_URL;
        }
        
        // Try localStorage (set by user)
        const stored = localStorage.getItem('server_url');
        if (stored) {
            return stored;
        }
        
        // Try detecting from current host
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // In production, assume server is at same domain
            // Update this based on where you deploy your backend
            return window.location.protocol + '//' + window.location.hostname;
        }
        
        // Default to localhost for development
        return 'http://localhost:3001';
    })()
};

console.log('[CONFIG] Server URL:', CONFIG.SERVER_URL);

// Make it available globally
window.CONFIG = CONFIG;
