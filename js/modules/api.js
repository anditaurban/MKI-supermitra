const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'mki-supermitra.vercel.app';
const baseUrl = isDevelopment ? 'https://devngomset.katib.cloud' : 'https://prod.masterkuliner.cloud';
const ownerId = '4427';

// Ekspos ke global scope (opsional tapi disarankan agar lebih aman)
window.baseUrl = baseUrl;
window.ownerId = ownerId;
window.isDevelopment = isDevelopment;
