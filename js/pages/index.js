// Global state for brands highlight
let allHighlights = [];
let isHighlightsExpanded = false;

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Authenticaton & Profile Management ---
    const user = JSON.parse(localStorage.getItem('mki_user'));
    const loginBtn = document.getElementById('login-btn');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
    }

    // Handle profile display once component is loaded
    document.addEventListener('profileNavLoaded', () => {
        const profileSection = document.getElementById('profile-section');
        if (user && profileSection) {
            profileSection.classList.remove('hidden');
            loadUserProfile(user);
        }
    });

    // --- 2. Brand Catalog Integration ---
    const highlightGrid = document.getElementById('highlightGrid');
    const brandsGrid = document.getElementById('brandsGrid');
    const highlightsAction = document.getElementById('highlightsAction');

    if (highlightGrid || brandsGrid) {
        try {
            const headers = {
                'Authorization': `Bearer ${window.apiToken}`,
                'Content-Type': 'application/json'
            };

            // Parallel fetching for both endpoints
            const [brandsResp, countResp] = await Promise.all([
                fetch(`${window.baseUrl}/list/business_category/${window.ownerId}`, { headers }),
                fetch(`${window.baseUrl}/list/business_category_count/${window.ownerId}`, { headers })
            ]);

            const brandsData = await brandsResp.json();
            const countData = await countResp.json();

            // 1. Handle Highlights (from business_category)
            if (brandsData.listData && brandsData.listData.length > 0) {
                allHighlights = [...brandsData.listData].sort((a, b) => (b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0));
                if (highlightGrid) {
                    renderHighlights(3);
                    if (allHighlights.length > 3) highlightsAction.classList.remove('hidden');
                }
            } else if (highlightGrid) {
                highlightGrid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Katalog Brand sedang dalam perawatan.</div>';
            }

            // 2. Handle brandsGrid (from business_category_count)
            if (countData.listData) {
                const countContent = countData.listData;
                
                // Update Global Pelanggan Badge
                const totalPelangganEl = document.getElementById('totalAllPelanggan');
                const statsContainer = document.getElementById('globalStatsContainer');
                if (totalPelangganEl && countContent.total_all_pelanggan) {
                    totalPelangganEl.textContent = countContent.total_all_pelanggan.toLocaleString();
                    statsContainer.classList.remove('opacity-0');
                }

                // Render the brand cards
                const brandsList = countContent.listData || [];
                if (brandsGrid && brandsList.length > 0) {
                    renderBrands(brandsList);
                } else if (brandsGrid) {
                    brandsGrid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Data statistik brand belum tersedia.</div>';
                }
            } else if (brandsGrid) {
                brandsGrid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Data statistik brand sedang dalam perawatan.</div>';
            }

        } catch (err) {
            console.error('Error fetching brand data:', err);
            const errorMsg = '<div class="col-span-full text-center py-10 text-slate-500">Gagal memuat data brand. Silakan coba lagi.</div>';
            if (highlightGrid) highlightGrid.innerHTML = errorMsg;
            if (brandsGrid) brandsGrid.innerHTML = errorMsg;
        }
    }

    // --- 3. Login Modal & OTP Logic ---
    const loginModal = document.getElementById('loginModal');
    const loginModalCard = document.getElementById('loginModalCard');
    const loginStep1 = document.getElementById('loginStep1');
    const loginStep2 = document.getElementById('loginStep2');
    const loginWhatsapp = document.getElementById('loginWhatsapp');
    const displayWaNumber = document.getElementById('displayWaNumber');
    const otpInputs = document.querySelectorAll('.otp-box');

    window.openLoginModal = () => {
        loginModal.classList.remove('hidden');
        setTimeout(() => {
            loginModalCard.classList.remove('scale-95', 'opacity-0');
            loginModalCard.classList.add('scale-100', 'opacity-100');
        }, 10);
        loginWhatsapp.focus();
    };

    window.closeLoginModal = () => {
        loginModalCard.classList.remove('scale-100', 'opacity-100');
        loginModalCard.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            loginModal.classList.add('hidden');
            loginStep1.classList.remove('hidden');
            loginStep2.classList.add('hidden');
            loginWhatsapp.value = '';
            otpInputs.forEach(input => input.value = '');
        }, 300);
    };

    // --- Logout Modal Logic ---
    const logoutModal = document.getElementById('logoutModal');
    const logoutModalCard = document.getElementById('logoutModalCard');

    window.openLogoutModal = () => {
        if (!logoutModal) return;
        logoutModal.classList.remove('hidden');
        setTimeout(() => {
            logoutModalCard.classList.remove('scale-95', 'opacity-0');
            logoutModalCard.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    window.closeLogoutModal = () => {
        if (!logoutModalCard) return;
        logoutModalCard.classList.remove('scale-100', 'opacity-100');
        logoutModalCard.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            if (logoutModal) logoutModal.classList.add('hidden');
        }, 300);
    };

    window.confirmLogout = () => {
        localStorage.removeItem('mki_user');
        localStorage.removeItem('mki_cart');
        window.location.reload();
    };

    window.backToStep1 = () => {
        loginStep2.classList.add('hidden');
        loginStep1.classList.remove('hidden');
        loginStep1.classList.add('animate-fade-in');
    };

    window.handleSendOTP = async () => {
        const whatsapp = loginWhatsapp.value.trim();
        if (!whatsapp) return toast('Mohon isi nomor WhatsApp.');
        if (!/^08[1-9][0-9]{7,10}$/.test(whatsapp)) return toast('Format WhatsApp tidak valid (08xxx).');

        const btn = document.getElementById('btnSendOTP');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="flex items-center justify-center"><svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Mengirim...</span>';

        try {
            const resp = await fetch(`${window.baseUrl}/client_login/${window.ownerId}/${whatsapp}`);
            const data = await resp.json();

            if (!resp.ok || data.message?.includes('Unauthorized')) {
                return toast('Nomor WhatsApp tidak terdaftar dalam sistem kemitraan.');
            }

            displayWaNumber.textContent = whatsapp;
            loginStep1.classList.add('hidden');
            loginStep2.classList.remove('hidden');
            otpInputs[0].focus();
        } catch (error) {
            console.error('Login error:', error);
            toast('Gagal mengirim OTP. Coba lagi.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    window.handleVerifyOTP = async () => {
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        if (otp.length !== 6) return toast('Lengkapi 6 digit kode OTP.');

        const btn = document.getElementById('btnVerifyOTP');
        btn.disabled = true;
        btn.textContent = 'Memverifikasi...';

        try {
            const resp = await fetch(`${window.baseUrl}/otp/client_login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp })
            });
            const data = await resp.json();

            if (data.message === 'Verifikasi OTP Sesuai') {
                localStorage.setItem('mki_user', JSON.stringify(data));
                window.location.href = '/store.html';
            } else {
                toast('Kode OTP salah.');
                otpInputs.forEach(i => i.value = '');
                otpInputs[0].focus();
            }
        } catch (error) {
            toast('Error verifikasi. Coba lagi.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verifikasi Sekarang';
        }
    };

    window.resendOTP = () => window.handleSendOTP();

    // OTP auto-advance logic
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val;
            if (val && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
        });
        input.addEventListener('paste', (e) => {
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            if (pasteData.length === 6) {
                pasteData.split('').forEach((char, i) => { if (otpInputs[i]) otpInputs[i].value = char; });
                otpInputs[5].focus();
            }
        });
    });
});

// --- Outside Helper Functions ---

function renderHighlights(limit) {
    const highlightGrid = document.getElementById('highlightGrid');
    if (!highlightGrid) return;
    const items = limit ? allHighlights.slice(0, limit) : allHighlights;

    highlightGrid.innerHTML = items.map(brand => {
        // Use thumbnail if available, otherwise go directly to UI-Avatar for highlights
        const thumbnail = brand.thumbnail;
        const displayImage = thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.business_category)}&background=dc2626&color=fff&size=512`;

        return `
            <a href="${brand.url || '#'}" target="${brand.url ? '_blank' : '_self'}" 
               class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-neutral-100 overflow-hidden block group animate-modal-in">
                <div class="aspect-[4/3] overflow-hidden bg-neutral-100 relative">
                    <img alt="${brand.business_category}"
                        class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        src="${displayImage}"
                        ${thumbnail ? `onerror="window.tryLoadAuthImage(this, '${thumbnail}')"` : ''}>
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur text-xs font-bold text-slate-800 px-3 py-1 rounded-full shadow-sm">
                        ${brand.status === 'Active' ? 'Hot Brand' : brand.status || 'Active'}
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="font-poppins text-xl font-bold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                        ${brand.description || brand.business_category}
                    </h3>
                    <p class="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">
                        Berbagai lini kuliner unggulan dengan standar operasional mutakhir untuk kesuksesan bisnis Anda.
                    </p>
                    <div class="flex items-center text-sm font-semibold text-red-600">
                        Selengkapnya <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

window.toggleHighlightView = function () {
    isHighlightsExpanded = !isHighlightsExpanded;
    const btnText = document.getElementById('toggleHighlightsText');
    const btnIcon = document.querySelector('#btnToggleHighlights svg');
    if (isHighlightsExpanded) {
        renderHighlights(0); // Show all
        btnText.textContent = 'Tampilkan Lebih Sedikit';
        if (btnIcon) btnIcon.classList.add('rotate-180');
    } else {
        renderHighlights(3); // Show 3
        btnText.textContent = 'Lihat Semua Brand';
        if (btnIcon) btnIcon.classList.remove('rotate-180');
        document.getElementById('highlightGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderBrands(listData) {
    const brandsGrid = document.getElementById('brandsGrid');
    if (!brandsGrid) return;
    brandsGrid.innerHTML = listData.map(brand => {
        const hasMainImage = brand.logo || brand.thumbnail;
        const displayImage = hasMainImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.business_category)}&background=dc2626&color=fff&size=512`;

        return `
            <a href="${brand.url || '#'}" target="${brand.url ? '_blank' : '_self'}" class="shrink-0 w-32 sm:w-40 md:w-48 lg:w-56 rounded-2xl bg-white border border-neutral-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg group">
                <div class="aspect-square rounded-t-2xl bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                    <img src="${displayImage}" 
                         class="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" 
                         alt="${brand.business_category}"
                         ${hasMainImage ? `onerror="tryLoadAuthImage(this, '${displayImage}')"` : ''}>
                </div>
                <div class="px-4 py-3 text-center border-t border-neutral-100 flex flex-col items-center">
                    <p class="text-sm sm:text-base font-poppins font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate w-full">${brand.business_category}</p>
                    <p class="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate w-full">${brand.description || 'Partner Aktif'}</p>
                    
                    <!-- Stats Badge -->
                    <div class="mt-2.5 flex items-center justify-center gap-1.5 py-1.5 px-4 bg-red-50/50 rounded-full border border-red-100/50 group-hover:bg-red-100 transition-colors">
                        <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span class="text-[11px] sm:text-xs font-black text-red-700 leading-none">
                            ${(brand.total_pelanggan || 0).toLocaleString()} <span class="font-bold text-red-500/80">Mitra</span>
                        </span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

// Dual-load strategy for thumbnails requiring authentication
window.tryLoadAuthImage = async function (img, url) {
    if (!url || url.includes('ui-avatars.com')) return;

    // Fallback to UI Avatar if it ultimately fails
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(img.alt || 'Brand')}&background=dc2626&color=fff&size=512`;

    // Prevent infinite loops
    img.onerror = () => { img.src = fallbackUrl; };

    console.log(`Direct load failed for ${url}, trying authenticated load...`);

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${window.apiToken}` }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        console.log(`Authenticated load successful for ${url}`);
    } catch (error) {
        console.error('Failure loading authenticated image:', error);
        img.src = fallbackUrl;
    }
}

window.toggleHighlightView = function () {
    isHighlightsExpanded = !isHighlightsExpanded;
    const btnText = document.getElementById('toggleHighlightsText');
    const btnIcon = document.querySelector('#btnToggleHighlights svg');
    if (isHighlightsExpanded) {
        renderHighlights(0); // Show all
        btnText.textContent = 'Tampilkan Lebih Sedikit';
        if (btnIcon) btnIcon.classList.add('rotate-180');
    } else {
        renderHighlights(3); // Show 3
        btnText.textContent = 'Lihat Semua Brand';
        if (btnIcon) btnIcon.classList.remove('rotate-180');
        document.getElementById('highlightGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function loadUserProfile(user) {
    const userName = user.name || user.email || 'User';
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = userName;
    const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
    const roleEl = document.getElementById('user-role');
    if (roleEl) roleEl.textContent = userRole;
    const firstLetter = userName.charAt(0).toUpperCase();
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = firstLetter;
}

function toast(message) {
    Swal.fire({
        text: message,
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}
