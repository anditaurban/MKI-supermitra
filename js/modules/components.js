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
