document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const profileContainer = document.getElementById('profile-content');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');

    // Make functions global for modal
    window.confirmLogout = function() {
        localStorage.removeItem('mki_user');
        window.location.href = '/';
    };

    window.closeLogoutModal = function() {
        const modal = document.getElementById('logout-modal');
        if(modal) {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    };

    // 1. Auth Check & Get Customer ID
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (!user) {
        window.location.href = '/';
        return;
    }

    const customerId = user.customer_id || user.owner_id;
    if (!customerId) {
        showError('Data ID pelanggan tidak ditemukan di sesi Anda. Harap login kembali.');
        return;
    }

    // 2. Handle profile component loading
    document.addEventListener('profileNavLoaded', () => {
        const profileSection = document.getElementById('profile-section');
        if (user && profileSection) {
            profileSection.classList.remove('hidden');
            loadUserProfile(user);
        }
    });

    function loadUserProfile(user) {
        const userName = user.nama || user.name || user.email || 'User';
        const nameEl = document.getElementById('user-name');
        if(nameEl) nameEl.textContent = userName;
        
        const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
        const roleEl = document.getElementById('user-role');
        if(roleEl) roleEl.textContent = userRole;
        
        const firstLetter = userName.charAt(0).toUpperCase();
        const navAvatarEl = document.getElementById('user-avatar');
        if(navAvatarEl) navAvatarEl.textContent = firstLetter;
    }

    // 3. Formatting Helpers
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // 3. Fetch Profile Data
    async function fetchProfileData() {
        try {
            const response = await fetch(`${window.baseUrl}/detail/client/${customerId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data.detail) {
                renderProfile(data.detail);
                showContent();
            } else {
                throw new Error('Format data tidak valid dari server.');
            }

        } catch (error) {
            console.error('Failed to fetch profile:', error);
            showError('Gagal memuat data profil. Pastikan koneksi internet Anda stabil atau coba lagi nanti.');
        }
    }

    // 4. Render Profile Data to DOM
    function renderProfile(detail) {
        // Photo / Avatar fallback
        const avatarEl = document.getElementById('profile-avatar');
        if (detail.photo) {
            avatarEl.src = detail.photo;
        } else {
            const encodedName = encodeURIComponent(detail.nama || 'User');
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodedName}&background=f1f5f9&color=dc2626&size=400&bold=true`;
        }

        // Identity
        document.getElementById('profile-name').textContent = detail.nama || '-';
        document.getElementById('profile-alias').textContent = detail.alias ? `@${detail.alias}` : '';
        document.getElementById('profile-membership').textContent = detail.no_membership || '-';
        
        // Status with dynamic color
        const statusEl = document.getElementById('profile-status');
        const statusText = detail.status || 'Unknown';
        statusEl.textContent = statusText;
        if (statusText.toLowerCase() === 'active') {
            statusEl.className = 'font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg text-xs';
        } else {
            statusEl.className = 'font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg text-xs';
        }

        // Dates
        document.getElementById('profile-joindate').textContent = formatDate(detail.join_date);
        document.getElementById('profile-birth').textContent = formatDate(detail.birth);

        // Contacts & Address
        document.getElementById('profile-whatsapp').textContent = detail.whatsapp || '-';
        document.getElementById('profile-email').textContent = detail.email || '-';
        document.getElementById('profile-nik').textContent = detail.nik || '-';
        document.getElementById('profile-address').textContent = detail.alamat || '-';
        document.getElementById('profile-region').textContent = detail.region_name || '-';

        // Business Categories Chips
        const businessContainer = document.getElementById('profile-business-cats');
        businessContainer.innerHTML = ''; // Clear previous

        if (detail.business_categories && detail.business_categories.length > 0) {
            detail.business_categories.forEach(cat => {
                const chip = document.createElement('span');
                chip.className = 'bg-red-50 border border-red-100 text-red-700 font-semibold px-4 py-2 rounded-xl text-sm shadow-sm';
                chip.textContent = cat.business_category;
                businessContainer.appendChild(chip);
            });
        } else {
            businessContainer.innerHTML = '<p class="text-slate-500 text-sm">Belum ada kategori bisnis.</p>';
        }
    }

    // State Handlers
    function showContent() {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    }

    function showError(message) {
        loadingState.classList.add('hidden');
        profileContainer.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = message;
    }

    // Init Request
    fetchProfileData();
});
