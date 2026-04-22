/**
 * MKI Component Loader
 * Loads shared HTML components like header, footer, and profile navigation
 */
document.addEventListener('DOMContentLoaded', () => {
    loadFooter();
    loadProfileNav();
});

/**
 * Load Footer Component
 */
async function loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;

    try {
        const response = await fetch('/components/footer.html');
        if (!response.ok) throw new Error('Failed to load footer');
        const html = await response.text();
        footerPlaceholder.innerHTML = html;
        document.dispatchEvent(new CustomEvent('footerLoaded'));
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

/**
 * Load Profile Navigation Component
 */
async function loadProfileNav() {
    const placeholder = document.getElementById('profile-nav-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('/components/profile-nav.html');
        if (!response.ok) throw new Error('Failed to load profile nav');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        // Initialize global handlers for the newly loaded content
        initProfileNavHandlers();
        initLogoutHandlers();

        // Populate nav from session if possible (helps first-load after login)
        try {
            const user = JSON.parse(localStorage.getItem('mki_user'));
            if (user && window.setNavAvatar) {
                // call immediately with whatever we have
                window.setNavAvatar(user);

                // Unhide the profile section so nav appears immediately
                const profileSectionEl = document.getElementById('profile-section');
                if (profileSectionEl) profileSectionEl.classList.remove('hidden');

                // Also populate name and role in the nav so it shows without page code
                try {
                    const nameEl = document.getElementById('user-name');
                    const roleEl = document.getElementById('user-role');
                    if (nameEl) nameEl.textContent = user.nama || user.name || user.email || 'User';
                    if (roleEl) roleEl.textContent = (user.role === 'admin' ? 'Admin' : 'Partner');
                } catch (err) {
                    console.debug('Could not set nav name/role:', err);
                }

                // if user has no photo, attempt to fetch detailed profile to get photo
                const customerId = user.customer_id || user.owner_id || user.client_id || user.xustomer_id;
                if (!user.photo && customerId && window.baseUrl && window.apiToken) {
                    fetch(`${window.baseUrl}/detail/client/${customerId}`, {
                        headers: { 'Authorization': `Bearer ${window.apiToken}` }
                    })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data && data.detail) {
                            // merge new photo into session and reapply avatar
                            const nextUser = { ...user, photo: data.detail.photo || user.photo };
                            localStorage.setItem('mki_user', JSON.stringify(nextUser));
                            window.setNavAvatar(nextUser);
                        }
                    })
                    .catch(err => console.debug('Could not refresh nav avatar:', err));
                }
            }
        } catch (e) {
            console.error('Error populating profile nav from session', e);
        }

        document.dispatchEvent(new CustomEvent('profileNavLoaded'));
    } catch (error) {
        console.error('Error loading profile nav:', error);
    }
}

/**
 * Common UI Handlers for Profile Dropdown
 */
function initProfileNavHandlers() {
    // We use a shared event listener for the toggle to avoid redundancy
    document.addEventListener('click', (e) => {
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        if (!profileBtn || !profileDropdown) return;

        // Toggle logic
        if (profileBtn.contains(e.target)) {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        } 
        // Outside click logic
        else if (!profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
}

/**
 * Global Logout Modal Handlers
 */
function initLogoutHandlers() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.openLogoutModal();
        });
    }

    // Modal elements might already exist in the HTML (static) or be part of a component
    // If we ever move the logout modal to a component, we'd handle it here.
    // For now, we just ensure the global window functions work.
}

window.openLogoutModal = () => {
    const logoutModal = document.getElementById('logoutModal');
    const logoutModalCard = document.getElementById('logoutModalCard');
    if (!logoutModal || !logoutModalCard) return;

    logoutModal.classList.remove('hidden');
    setTimeout(() => {
        logoutModalCard.classList.remove('scale-95', 'opacity-0');
        logoutModalCard.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeLogoutModal = () => {
    const logoutModal = document.getElementById('logoutModal');
    const logoutModalCard = document.getElementById('logoutModalCard');
    if (!logoutModal || !logoutModalCard) return;

    logoutModalCard.classList.remove('scale-100', 'opacity-100');
    logoutModalCard.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        logoutModal.classList.add('hidden');
    }, 300);
};

window.confirmLogout = () => {
    localStorage.removeItem('mki_user');
    localStorage.removeItem('mki_cart');
    window.location.href = '/';
};
