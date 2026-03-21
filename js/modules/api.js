const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'mki-supermitra.vercel.app';
const baseUrl = isDevelopment ? 'https://devngomset.katib.cloud' : 'https://prod.masterkuliner.cloud';
const ownerId = '4427';
const apiToken = '3ed66de3108ce387e9d134c419c0fdd61687c3b06760419d32493b18366999d2';

// Ekspos ke global scope (opsional tapi disarankan agar lebih aman)
window.baseUrl = baseUrl;
window.ownerId = ownerId;
window.isDevelopment = isDevelopment;
window.apiToken = apiToken;
