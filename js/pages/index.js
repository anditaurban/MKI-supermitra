// Global state for brands highlight
let allHighlights = [];
let isHighlightsExpanded = false;
let allBrands = [];
let isBrandsExpanded = false;
let mitraMap = null;

let clientRegionData = []; // Will be populated from API

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Authenticaton & Profile Management ---
    const user = JSON.parse(localStorage.getItem('mki_user'));
    const loginBtn = document.getElementById('login-btn');
    const mobileAuthPlaceholder = document.getElementById('mobile-auth-placeholder');
    const mobileUserSegment = document.getElementById('mobile-user-segment');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (mobileAuthPlaceholder) mobileAuthPlaceholder.classList.add('hidden');
        if (mobileUserSegment) mobileUserSegment.classList.remove('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (mobileAuthPlaceholder) mobileAuthPlaceholder.classList.remove('hidden');
        if (mobileUserSegment) mobileUserSegment.classList.add('hidden');
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
    const brandsAction = document.getElementById('brandsAction');

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
                const heroTrustedCountEl = document.getElementById('heroTrustedCount');
                const heroMitraCountEl = document.getElementById('heroMitraCount');
                const statsContainer = document.getElementById('globalStatsContainer');
                if (totalPelangganEl && countContent.total_all_pelanggan) {
                    const formattedTotalPelanggan = Number(countContent.total_all_pelanggan).toLocaleString('en-US');
                    totalPelangganEl.textContent = formattedTotalPelanggan;
                    if (heroTrustedCountEl) heroTrustedCountEl.textContent = `${totalPelangganEl.textContent}+`;
                    if (heroMitraCountEl) heroMitraCountEl.textContent = `${totalPelangganEl.textContent}+`;
                    statsContainer.classList.remove('opacity-0');
                }

                // Render the brand cards
                const brandsList = countContent.listData || [];
                if (brandsGrid && brandsList.length > 0) {
                    allBrands = brandsList;
                    renderBrands();
                    if (brandsAction && allBrands.length > getInitialBrandLimit()) {
                        brandsAction.classList.remove('hidden');
                    }
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

    window.addEventListener('resize', handleBrandResize);

    // --- Mitra Spread Map: fetch region data then init map ---
    fetchClientRegionData();

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

    // --- 4. Mobile Menu Logic ---
    window.toggleMobileMenu = () => {
        const menu = document.getElementById('mobileMenu');
        const icon = document.getElementById('mobileMenuIcon');
        if (!menu || !icon) return;

        const isOpen = menu.classList.contains('translate-x-0');
        if (isOpen) {
            menu.classList.remove('translate-x-0');
            menu.classList.add('translate-x-full');
            setTimeout(() => menu.classList.add('invisible'), 300);
            icon.classList.remove('ri-close-line');
            icon.classList.add('ri-menu-4-fill');
            document.body.style.overflow = '';
        } else {
            menu.classList.remove('invisible');
            menu.classList.remove('translate-x-full');
            menu.classList.add('translate-x-0');
            icon.classList.remove('ri-menu-4-fill');
            icon.classList.add('ri-close-line');
            document.body.style.overflow = 'hidden';
        }
    };

    // --- 5. Testimonial Slider Logic ---
    let testimonialPool = [];
    let currentTestimonialPage = 0;
    const itemsPerPage = 5;

    const testimonialGrid = document.getElementById('testimonial-grid');
    const testimonialPrevBtn = document.getElementById('testimonial-prev');
    const testimonialNextBtn = document.getElementById('testimonial-next');
    const testimonialPageEl = document.getElementById('current-testimonial-page');

    async function fetchTestimonials() {
        if (!testimonialNextBtn) return;
        testimonialNextBtn.disabled = true;
        
        try {
            const resp = await fetch(`${window.baseUrl}/list/testimonial/${window.ownerId}`, {
                headers: { 'Authorization': `Bearer ${window.apiToken}` }
            });
            const data = await resp.json();
            
            if (data.listData && data.listData.length > 0) {
                // Keep the pool manageable, but append new random samples
                testimonialPool = [...testimonialPool, ...data.listData];
                renderTestimonialSlide();
            }
        } catch (err) {
            console.error('Error fetching testimonials:', err);
            if (testimonialGrid && testimonialPool.length === 0) {
                testimonialGrid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Gagal memuat ulasan mitra.</div>';
            }
        } finally {
            testimonialNextBtn.disabled = false;
        }
    }

    function renderTestimonialSlide() {
        if (!testimonialGrid) return;

        const start = currentTestimonialPage * itemsPerPage;
        const end = start + itemsPerPage;
        const items = testimonialPool.slice(start, end);

        if (items.length === 0 && currentTestimonialPage > 0) {
            currentTestimonialPage--;
            return;
        }

        testimonialGrid.style.opacity = '0';
        
        setTimeout(() => {
            testimonialGrid.innerHTML = items.map(t => {
                const rating = parseInt(t.star_rating) || 5;
                const stars = Array(5).fill(0).map((_, i) => `
                    <svg class="w-4 h-4 ${i < rating ? 'text-amber-400' : 'text-slate-200'}" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                `).join('');

                const avatarName = encodeURIComponent(t.testimonial_name || 'User');
                const avatar = `https://ui-avatars.com/api/?name=${avatarName}&background=fecaca&color=dc2626&bold=true`;

                return `
                    <div class="rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl shadow-slate-200/40 transform hover:-translate-y-2 transition-all duration-300 animate-modal-in">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="h-12 w-12 overflow-hidden rounded-full ring-2 ring-red-100">
                                <img alt="${t.testimonial_name}" class="h-full w-full object-cover" loading="lazy" src="${avatar}">
                            </div>
                            <div class="min-w-0">
                                <p class="truncate text-sm font-bold text-slate-900 font-poppins">${t.testimonial_name}</p>
                                <div class="flex mt-0.5">${stars}</div>
                            </div>
                        </div>
                        <p class="text-sm leading-relaxed text-slate-600 italic line-clamp-4">“${t.testimonial_text}”</p>
                    </div>
                `;
            }).join('');
            
            testimonialGrid.style.opacity = '1';
            if (testimonialPageEl) testimonialPageEl.textContent = currentTestimonialPage + 1;
            if (testimonialPrevBtn) testimonialPrevBtn.disabled = currentTestimonialPage === 0;
        }, 300);
    }

    if (testimonialNextBtn) {
        testimonialNextBtn.addEventListener('click', async () => {
            currentTestimonialPage++;
            const startOfNext = currentTestimonialPage * itemsPerPage;
            
            if (startOfNext >= testimonialPool.length) {
                await fetchTestimonials();
            } else {
                renderTestimonialSlide();
            }
        });
    }

    if (testimonialPrevBtn) {
        testimonialPrevBtn.addEventListener('click', () => {
            if (currentTestimonialPage > 0) {
                currentTestimonialPage--;
                renderTestimonialSlide();
            }
        });
    }

    // Initial fetch
    if (testimonialGrid) {
        fetchTestimonials();
    }
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
    const source = Array.isArray(listData) ? listData : allBrands;
    const visibleBrands = isBrandsExpanded ? source : source.slice(0, getInitialBrandLimit());

    brandsGrid.innerHTML = visibleBrands.map(brand => {
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

    updateBrandsToggle();
}

function getInitialBrandLimit() {
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 768) return 3;
    return 2;
}

function updateBrandsToggle() {
    const brandsAction = document.getElementById('brandsAction');
    const btnText = document.getElementById('toggleBrandsText');
    const btnIcon = document.querySelector('#btnToggleBrands svg');
    if (!brandsAction || !btnText) return;

    const shouldShowToggle = allBrands.length > getInitialBrandLimit();
    brandsAction.classList.toggle('hidden', !shouldShowToggle);

    if (!shouldShowToggle) return;

    btnText.textContent = isBrandsExpanded ? 'Tampilkan Lebih Sedikit' : 'Lihat Selengkapnya';
    if (btnIcon) {
        btnIcon.classList.toggle('rotate-180', isBrandsExpanded);
    }
}

function handleBrandResize() {
    if (!allBrands.length || isBrandsExpanded) return;
    renderBrands();
}

window.toggleBrandsView = function () {
    if (!allBrands.length) return;

    isBrandsExpanded = !isBrandsExpanded;
    renderBrands();

    if (!isBrandsExpanded) {
        const brandsGrid = document.getElementById('brandsGrid');
        if (brandsGrid) {
            brandsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

async function fetchClientRegionData() {
    try {
        const resp = await fetch(`${window.baseUrl}/summary/client_region/${window.ownerId}`, {
            headers: { 'Authorization': `Bearer ${window.apiToken}` }
        });
        const data = await resp.json();

        if (data.summaryData && Array.isArray(data.summaryData)) {
            clientRegionData = data.summaryData;
        }
    } catch (err) {
        console.error('[MitraMap] Gagal memuat data region:', err);
    } finally {
        // Always init map (will use API data if available, else empty)
        initializeMitraLeafletMap();
        updateMitraSpreadStats();
    }
}

function updateMitraSpreadStats() {
    if (!clientRegionData.length) return;

    // --- Total Calon Mitra ---
    const total = clientRegionData.reduce((sum, r) => sum + (parseInt(r.count) || 0), 0);
    const totalEl = document.getElementById('mitraSpreadTotal');
    if (totalEl) totalEl.textContent = total.toLocaleString('id-ID');

    // --- Top Wilayah Paling Aktif (top 4) ---
    const sorted = [...clientRegionData].sort((a, b) => (parseInt(b.count) || 0) - (parseInt(a.count) || 0));
    const top4 = sorted.slice(0, 4);
    const maxCount = parseInt(top4[0]?.count) || 1;

    const colors = ['bg-red-600', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500'];
    const topListEl = document.getElementById('mitraTopRegionList');
    if (topListEl) {
        topListEl.innerHTML = top4.map((region, i) => {
            const count = parseInt(region.count) || 0;
            const pct = Math.round((count / maxCount) * 100);
            return `
                <div>
                    <div class="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                        <span class="truncate max-w-[140px]" title="${region.region_name}">${region.region_name}</span>
                        <span>${count.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div class="h-full ${colors[i] || 'bg-slate-400'} rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Update Insight text & tags dynamically based on API data ---
    const insightTextEl = document.getElementById('mitraInsightText');
    const insightTagsEl = document.getElementById('mitraInsightTags');
    try {
        const topNames = sorted.slice(0, 5).map(r => r.region_name);

        if (insightTextEl) {
            if (topNames.length) {
                // Join with commas and replace last comma with ' dan ' for natural Indonesian
                const joined = topNames.join(', ').replace(/, ([^,]*)$/, ' dan $1');
                insightTextEl.textContent = `Minat kemitraan paling kuat terlihat di ${joined}.`;
            } else {
                insightTextEl.textContent = 'Minat kemitraan tersebar di berbagai wilayah Indonesia.';
            }
        }

        if (insightTagsEl) {
            if (topNames.length) {
                insightTagsEl.innerHTML = topNames.map(n => `
                    <span class="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">${n}</span>
                `).join('');
            } else {
                insightTagsEl.innerHTML = '';
            }
        }
    } catch (e) {
        console.error('Gagal memperbarui insight mitra:', e);
    }
}

function initializeMitraLeafletMap() {
    const mapContainer = document.getElementById('indonesiaLeafletMap');
    if (!mapContainer || typeof window.L === 'undefined' || mitraMap) return;

    mitraMap = window.L.map(mapContainer, {
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 4,
        maxZoom: 13
    });

    const indonesiaBounds = window.L.latLngBounds(
        window.L.latLng(-11.5, 94.0),
        window.L.latLng(6.5, 141.5)
    );

    mitraMap.fitBounds(indonesiaBounds, { padding: [10, 10] });
    mitraMap.setMaxBounds(indonesiaBounds.pad(0.15));

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mitraMap);

    if (!clientRegionData.length) {
        setTimeout(() => mitraMap.invalidateSize(), 150);
        return;
    }

    const maxCount = Math.max(...clientRegionData.map(r => parseInt(r.count) || 0), 1);

    clientRegionData.forEach(region => {
        const lat = parseFloat(region.lat);
        const lng = parseFloat(region.lng);
        const count = parseInt(region.count) || 0;
        if (isNaN(lat) || isNaN(lng)) return;

        // Scale marker size proportionally (min 14px, max 36px)
        const size = Math.round(14 + ((count / maxCount) * 22));
        const markerIcon = window.L.divIcon({
            className: '',
            html: `<div style="
                width:${size}px;
                height:${size}px;
                background:rgba(220,38,38,0.85);
                border:${size > 20 ? 3 : 2}px solid rgba(255,255,255,0.92);
                border-radius:9999px;
                box-shadow:0 4px 16px rgba(220,38,38,0.35);
                display:flex;
                align-items:center;
                justify-content:center;
            "></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -(size / 2) - 4]
        });

        const marker = window.L.marker([lat, lng], { icon: markerIcon }).addTo(mitraMap);
        marker.bindPopup(`
            <div class="min-w-[180px]">
                <p class="text-sm font-bold text-slate-900">${region.region_name}</p>
                <div class="mt-3">
                    <span class="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">${count.toLocaleString('id-ID')} pendaftar</span>
                </div>
            </div>
        `, { className: 'mitra-map-popup' });
    });

    setTimeout(() => mitraMap.invalidateSize(), 150);
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


function loadUserProfile(user) {
    const userName = user.name || user.email || 'User';
    const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
    const firstLetter = userName.charAt(0).toUpperCase();

    // Desktop elements
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = userName;
    const roleEl = document.getElementById('user-role');
    if (roleEl) roleEl.textContent = userRole;
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = firstLetter;

    // Mobile elements
    const mobileNameEl = document.getElementById('mobile-user-name');
    if (mobileNameEl) mobileNameEl.textContent = userName;
    const mobileRoleEl = document.getElementById('mobile-user-role');
    if (mobileRoleEl) mobileRoleEl.textContent = userRole;
    const mobileAvatarEl = document.getElementById('mobile-user-avatar');
    if (mobileAvatarEl) mobileAvatarEl.textContent = firstLetter;
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
