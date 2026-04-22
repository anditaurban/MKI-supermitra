document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const profileContainer = document.getElementById('profile-content');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const profileAvatar = document.getElementById('profile-avatar');
    const photoInput = document.getElementById('profile-photo-input');
    const photoTrigger = document.getElementById('profile-photo-trigger');
    const photoTriggerText = document.getElementById('profile-photo-trigger-text');

    // Make functions global for modal
    window.confirmLogout = function () {
        localStorage.removeItem('mki_user');
        window.location.href = '/';
    };

    window.closeLogoutModal = function () {
        const modal = document.getElementById('logout-modal');
        if (modal) {
            modal.classList.remove('opacity-100');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    };

    window.openEditProfileModal = function () {
        const modal = document.getElementById('edit-profile-modal');
        if (modal && window.currentProfileDetail) {
            const d = window.currentProfileDetail;
            document.getElementById('edit-nama').value = d.nama || '';
            document.getElementById('edit-whatsapp').value = d.whatsapp || '';
            document.getElementById('edit-email').value = d.email || '';
            document.getElementById('edit-alamat').value = d.alamat || '';
            document.getElementById('edit-nik').value = d.nik || '';
            if (d.birth) {
                try {
                    const dateObj = new Date(d.birth);
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    document.getElementById('edit-birth').value = `${yyyy}-${mm}-${dd}`;
                } catch (e) { }
            } else {
                document.getElementById('edit-birth').value = '';
            }

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                const transformEl = modal.querySelector('.transform');
                if (transformEl) {
                    transformEl.classList.remove('scale-95');
                    transformEl.classList.add('scale-100');
                }
            }, 10);
        }
    };

    window.closeEditProfileModal = function () {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            const transformEl = modal.querySelector('.transform');
            if (transformEl) {
                transformEl.classList.remove('scale-100');
                transformEl.classList.add('scale-95');
            }
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

    const customerId = user.xustomer_id || user.customer_id || user.owner_id;
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
        if (nameEl) nameEl.textContent = userName;

        const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
        const roleEl = document.getElementById('user-role');
        if (roleEl) roleEl.textContent = userRole;

        const firstLetter = userName.charAt(0).toUpperCase();
        const navAvatarEl = document.getElementById('user-avatar');
        if (navAvatarEl) navAvatarEl.textContent = firstLetter;
    }

    function getAvatarFallback(name) {
        const encodedName = encodeURIComponent(name || 'User');
        return `https://ui-avatars.com/api/?name=${encodedName}&background=f1f5f9&color=dc2626&size=400&bold=true`;
    }

    async function setProfileAvatar(detail = {}) {
        if (!profileAvatar) return;
        const fallbackUrl = getAvatarFallback(detail.nama || user.nama || user.name || user.email || 'User');
        const photoPath = detail.photo || user.photo;

        if (!photoPath) {
            profileAvatar.src = fallbackUrl;
            return;
        }

        let fullUrl = photoPath;
        if (!photoPath.startsWith('http')) {
            if (!photoPath.includes('/')) {
                fullUrl = `${window.baseUrl}/photo/client/${photoPath}`;
            } else {
                fullUrl = `${window.baseUrl}/${photoPath.replace(/^\//, '')}`;
            }
        }

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${window.apiToken}` }
            });
            if (!response.ok) throw new Error('Gagal memuat foto');
            const blob = await response.blob();
            profileAvatar.src = URL.createObjectURL(blob);
        } catch (err) {
            console.error('[AVATAR] fetch failed:', err);
            profileAvatar.src = fallbackUrl;
        }
    }

    function syncUserSession(detail = {}) {
        const nextUser = {
            ...user,
            nama: detail.nama || user.nama,
            name: detail.nama || user.name,
            photo: detail.photo || user.photo
        };

        localStorage.setItem('mki_user', JSON.stringify(nextUser));
        if (window.setNavAvatar) window.setNavAvatar(nextUser);
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
                syncUserSession(data.detail);
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
        window.currentProfileDetail = detail;
        const btnEdit = document.getElementById('btn-open-edit');
        if (btnEdit) btnEdit.classList.remove('hidden');

        setProfileAvatar(detail);

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

    async function updateProfilePhoto(file) {
        if (!file) return;

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.type)) {
            profileToast('warning', 'Format foto harus JPG, JPEG, PNG, atau WEBP.');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            profileToast('warning', 'File too large. Maximum size is 5MB.');
            return;
        }

        const originalButtonText = photoTriggerText ? photoTriggerText.textContent : '';
        if (photoTrigger) photoTrigger.disabled = true;
        if (photoTriggerText) photoTriggerText.textContent = 'Mengunggah...';

        const previousAvatarSrc = profileAvatar ? profileAvatar.src : '';
        if (profileAvatar) {
            profileAvatar.src = URL.createObjectURL(file);
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch(`${window.baseUrl}/update/client_photo/${customerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${window.apiToken}`
                },
                body: formData
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            profileToast('success', data.message || 'Foto profil berhasil diperbarui.');
            await fetchProfileData();
        } catch (error) {
            console.error('Failed to update profile photo:', error);
            if (profileAvatar && previousAvatarSrc) {
                profileAvatar.src = previousAvatarSrc;
            }
            profileToast('error', error.message || 'Gagal mengunggah foto profil.');
        } finally {
            if (photoTrigger) photoTrigger.disabled = false;
            if (photoTriggerText) photoTriggerText.textContent = originalButtonText || 'Update Foto';
            if (photoInput) photoInput.value = '';
        }
    }

    function profileToast(icon, message) {
        Swal.fire({
            icon,
            text: message,
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            customClass: { popup: 'rounded-2xl shadow-xl text-sm' }
        });
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

    if (photoTrigger && photoInput) {
        photoTrigger.addEventListener('click', () => {
            photoInput.click();
        });

        photoInput.addEventListener('change', (event) => {
            const file = event.target.files && event.target.files[0];
            updateProfilePhoto(file);
        });
    }

    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const payload = {
                nama: document.getElementById('edit-nama').value,
                whatsapp: document.getElementById('edit-whatsapp').value,
                email: document.getElementById('edit-email').value,
                alamat: document.getElementById('edit-alamat').value,
                nik: document.getElementById('edit-nik').value,
                birth: document.getElementById('edit-birth').value
            };

            const originalText = btnSaveProfile.innerHTML;
            btnSaveProfile.disabled = true;
            btnSaveProfile.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...</span>';

            try {
                const response = await fetch(`${window.baseUrl}/update/client_profile/${customerId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${window.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || 'Gagal menyimpan profil');
                }

                Swal.fire({
                    icon: 'success',
                    text: data.message || 'Profil berhasil diperbarui.',
                    confirmButtonColor: '#DC2626'
                });

                window.closeEditProfileModal();
                await fetchProfileData();
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    text: error.message || 'Terjadi kesalahan saat menyimpan data profil.',
                    confirmButtonColor: '#DC2626'
                });
            } finally {
                btnSaveProfile.disabled = false;
                btnSaveProfile.innerHTML = originalText;
            }
        });
    }

    // Init Request
    fetchProfileData();
});
