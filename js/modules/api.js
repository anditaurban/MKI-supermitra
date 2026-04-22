const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'mki-supermitra.vercel.app';
const baseUrl = isDevelopment ? 'https://devngomset.katib.cloud' : 'https://prod.masterkuliner.cloud';
const ownerId = '4427';
const apiToken = '3ed66de3108ce387e9d134c419c0fdd61687c3b06760419d32493b18366999d2';

// Ekspos ke global scope (opsional tapi disarankan agar lebih aman)
window.baseUrl = baseUrl;
window.ownerId = ownerId;
window.isDevelopment = isDevelopment;
window.apiToken = apiToken;

window.setNavAvatar = async function(user) {
    if(!user) return;

    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama || user.name || user.email || 'User')}&background=f1f5f9&color=dc2626&size=400&bold=true`;

    const avatarImg = document.getElementById('user-avatar-img');
    const avatarSpan = document.getElementById('user-avatar');
    const mobileAvatarImg = document.getElementById('mobile-user-avatar-img');
    const mobileAvatarSpan = document.getElementById('mobile-user-avatar');

    const applyImage = (src) => {
        if(avatarImg) {
            avatarImg.src = src;
            avatarImg.classList.remove('hidden');
            if(avatarSpan) avatarSpan.classList.add('hidden');
        }
        if(mobileAvatarImg) {
            mobileAvatarImg.src = src;
            mobileAvatarImg.classList.remove('hidden');
            if(mobileAvatarSpan) mobileAvatarSpan.classList.add('hidden');
        }
    };

    if(!user.photo) {
        applyImage(fallbackUrl);
        return;
    }

    let fullUrl = user.photo;
    if (!user.photo.startsWith('http')) {
        if (!user.photo.includes('/')) {
            fullUrl = `${window.baseUrl}/photo/client/${user.photo}`;
        } else {
            fullUrl = `${window.baseUrl}/${user.photo.replace(/^\//, '')}`;
        }
    }

    try {
        const response = await fetch(fullUrl, {
            headers: { 'Authorization': `Bearer ${window.apiToken}` }
        });
        if (!response.ok) throw new Error('Failed to load nav avatar');
        const blob = await response.blob();
        applyImage(URL.createObjectURL(blob));
    } catch (e) {
        console.error('[NAV AVATAR] fetch failed:', e);
        applyImage(fallbackUrl);
    }
};

document.addEventListener('profileNavLoaded', () => {
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (user) {
        window.setNavAvatar(user);
    }
});
