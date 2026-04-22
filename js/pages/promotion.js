// promotion.js - load partner categories and allow downloading promo media
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('promo-grid');
    const container = document.getElementById('promo-grid-container');
    const empty = document.getElementById('promo-empty');

    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (!user) {
        window.location.href = '/';
        return;
    }

    document.addEventListener('profileNavLoaded', () => {
        const profileSection = document.getElementById('profile-section');
        if (user && profileSection) {
            profileSection.classList.remove('hidden');
            loadUserProfile(user);
        }
    });

    showLoading();

    const customerId = user.xustomer_id || user.customer_id || user.owner_id || user.client_id;
    if (!customerId) {
        showError('Silakan login kembali untuk melihat materi promosi Anda.');
        return;
    }

    try {
        const resp = await fetch(`${window.baseUrl}/detail/client/${customerId}`, {
            headers: { Authorization: `Bearer ${window.apiToken}` }
        });
        if (!resp.ok) throw new Error('no-response');

        const data = await resp.json();
        const detail = data && data.detail ? data.detail : data;
        const categories = detail && detail.business_categories ? detail.business_categories : [];

        if (!categories.length) {
            grid.innerHTML = '';
            container.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            return;
        }

        container.classList.remove('hidden');
        empty.classList.add('hidden');
        empty.classList.remove('flex');
        renderPromotionCategories(categories);
        bindDownloadButtons();
    } catch (err) {
        console.error('Gagal memuat kategori promosi:', err);
        showError('Gagal memuat daftar materi promosi. Silakan muat ulang halaman.');
    }

    function loadUserProfile(currentUser) {
        const userName = currentUser.name || currentUser.email || 'User';
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = userName;

        const userRole = currentUser.role === 'admin' ? 'Admin' : 'Partner';
        const roleEl = document.getElementById('user-role');
        if (roleEl) roleEl.textContent = userRole;

        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();
    }

    function showLoading() {
        if (!grid) return;

        container.classList.remove('hidden');
        empty.classList.add('hidden');
        empty.classList.remove('flex');
        grid.innerHTML = `
            <div class="col-span-full flex items-center justify-center p-12 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                <div class="flex flex-col items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-slate-500 font-medium animate-pulse">Memuat materi promosi...</p>
                </div>
            </div>
        `;
    }

    function showError(message) {
        container.classList.remove('hidden');
        empty.classList.add('hidden');
        empty.classList.remove('flex');
        grid.innerHTML = `
            <div class="col-span-full bg-red-50 text-red-800 p-6 rounded-2xl border border-red-100 flex items-center justify-center gap-4 shadow-sm">
                <svg class="w-8 h-8 opacity-80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div class="text-sm font-medium">${escapeHtml(message)} <button onclick="location.reload()" class="underline hover:text-red-900 font-bold">Muat ulang</button>.</div>
            </div>
        `;
    }

    function renderPromotionCategories(categories) {
        grid.innerHTML = categories.map(category => {
            const title = category.business_category || category.name || 'Kategori';
            const description = category.description || 'Materi promosi siap digunakan untuk mendukung aktivitas pemasaran bisnis Anda.';
            const img = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=dc2626&color=fff&size=512`;
            const promo = category.promo_media_url || category.promo || category.promotional_media || '';
            const hasPromo = Boolean(promo);

            return `
                <div class="bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col h-full">
                    <div class="aspect-video w-full bg-slate-50 border-b border-neutral-100 overflow-hidden relative group shrink-0">
                        <img src="${img}" alt="${escapeAttr(title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="absolute top-3 right-3">
                            <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-red-600 rounded-full shadow-sm border border-red-50 uppercase tracking-wider">${escapeHtml(title)}</span>
                        </div>
                    </div>

                    <div class="p-6 flex-1 flex flex-col">
                        <div class="mb-5 pb-4 border-b border-gray-50">
                            <h3 class="text-lg font-bold text-slate-800 font-poppins line-clamp-2 leading-tight mb-2">${escapeHtml(title)}</h3>
                            <div class="flex items-center gap-2">
                                <div class="flex -space-x-2">
                                    <div class="w-6 h-6 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-[10px] text-red-600 font-bold">M</div>
                                    <div class="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-600 font-bold">K</div>
                                    <div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">I</div>
                                </div>
                                <p class="text-xs text-slate-500 font-medium ml-1">${hasPromo ? 'Materi siap diunduh' : 'Preview kategori tersedia'}</p>
                            </div>
                        </div>

                        <div class="flex-1">
                            <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(description)}</p>
                        </div>

                        <div class="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
                            <a href="#" data-media="${escapeAttr(promo)}" data-img="${escapeAttr(img)}" data-title="${escapeAttr(title)}"
                                class="btn-download inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/20 transition-all transform active:scale-[0.98]">
                                <i class="ri-download-2-line text-lg"></i>
                                <span>Unduh Materi</span>
                            </a>
                            ${hasPromo ? `<a href="${escapeAttr(promo)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors">Buka <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3h7m0 0v7m0-7L10 14"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5v14h14"></path></svg></a>` : `<span class="text-sm text-slate-400 italic">File belum tersedia</span>`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function bindDownloadButtons() {
        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const media = btn.dataset.media;
                const title = btn.dataset.title || 'promo';

                if (!media) {
                    const img = btn.dataset.img;
                    if (img) {
                        await downloadWithAuth(img, `${slugify(title)}-image`);
                        return;
                    }

                    showDownloadInfo();
                    return;
                }

                await downloadWithAuth(media, `${slugify(title)}-promo`);
            });
        });
    }

    function showDownloadInfo() {
        if (window.Swal) {
            Swal.fire({
                icon: 'info',
                title: 'Materi Belum Tersedia',
                text: 'Tidak ada file promosi yang bisa diunduh untuk kategori ini saat ini.',
                confirmButtonColor: '#dc2626'
            });
            return;
        }

        alert('Tidak ada file promosi yang bisa diunduh untuk kategori ini saat ini.');
    }

    function escapeHtml(s) {
        if (!s && s !== 0) return '';
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function escapeAttr(s) {
        return (s || '').replace(/"/g, '&quot;');
    }

    function slugify(s) {
        return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    async function downloadWithAuth(url, filenameBase) {
        try {
            const headers = { Authorization: `Bearer ${window.apiToken}` };
            const resolvedUrl = url.startsWith('/') ? `${window.baseUrl}${url}` : url;
            const resp = await fetch(resolvedUrl, { headers });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const blob = await resp.blob();
            const ext = (resp.headers.get('content-type') || '').split('/').pop() || 'bin';
            const a = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
            a.download = `${filenameBase}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
        } catch (e) {
            console.error('download failed', e);

            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Mengunduh',
                    text: 'File promosi tidak dapat diunduh sekarang. Coba buka file di tab baru atau ulangi beberapa saat lagi.',
                    confirmButtonColor: '#dc2626'
                });
            } else {
                alert('Gagal mengunduh file. Coba buka file di tab baru.');
            }
        }
    }
});
