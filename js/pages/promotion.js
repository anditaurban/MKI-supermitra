// promotion.js - load partner promo categories and allow downloading promo media
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('promo-grid');
    const container = document.getElementById('promo-grid-container');
    const empty = document.getElementById('promo-empty');
    let previewObjectUrl = '';
    let previewModalElements = null;

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
    createPreviewModal();

    const customerId = user.xustomer_id || user.customer_id || user.owner_id || user.client_id;
    if (!customerId) {
        showError('Silakan login kembali untuk melihat materi promosi Anda.');
        return;
    }

    try {
        const resp = await fetch(`${window.baseUrl}/list/business_category_media/${customerId}`, {
            headers: { Authorization: `Bearer ${window.apiToken}` }
        });
        if (!resp.ok) throw new Error('no-response');

        const data = await resp.json();
        const categories = Array.isArray(data?.listData) ? data.listData : [];

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
        bindPreviewButtons();
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
            const title = category.description || 'Kategori Promosi';
            const businessCategory = category.business_category;
            const description = category.description || 'Materi promosi siap digunakan untuk mendukung aktivitas pemasaran bisnis Anda.';
            const img = category.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=dc2626&color=fff&size=512`;
            const mediaList = Array.isArray(category.media) ? category.media : [];
            const hasPromo = mediaList.length > 0;
            const mediaMarkup = hasPromo
                ? mediaList.map((mediaItem, index) => {
                    const mediaTitle = mediaItem?.title || `Media ${index + 1}`;
                    const mediaFile = mediaItem?.file || '';

                    return `
                        <div class="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-sm font-semibold text-slate-800 line-clamp-2">${escapeHtml(mediaTitle)}</p>
                                <p class="mt-1 text-xs text-slate-500">File promosi siap diunduh.</p>
                            </div>
                            <div class="shrink-0 flex items-center gap-2">
                                <button type="button"
                                    data-preview="${escapeAttr(mediaFile)}"
                                    data-title="${escapeAttr(mediaTitle)}"
                                    data-filename="${escapeAttr(`${title}-${mediaTitle}`)}"
                                    class="btn-preview inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                                    aria-label="Preview ${escapeAttr(mediaTitle)}">
                                    <i class="ri-external-link-line text-lg"></i>
                                </button>
                                <button type="button"
                                    data-media="${escapeAttr(mediaFile)}"
                                    data-title="${escapeAttr(`${title}-${mediaTitle}`)}"
                                    class="btn-download inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/20 transition-all transform active:scale-[0.98]">
                                    <i class="ri-download-2-line text-lg"></i>
                                    <span class="btn-download-label">Unduh</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')
                : `
                    <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400 italic">
                        Belum ada file media promosi untuk kategori ini.
                    </div>
                `;

            return `
                <div class="bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col h-full">
                    <div class="aspect-video w-full bg-slate-50 border-b border-neutral-100 overflow-hidden relative group shrink-0">
                        <img src="${img}" alt="${escapeAttr(businessCategory)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="absolute top-3 right-3">
                            <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-red-600 rounded-full shadow-sm border border-red-50 uppercase tracking-wider">${escapeHtml(businessCategory)}</span>
                        </div>
                    </div>

                    <div class="p-6 flex flex-col">
                        <div class="pb-4 border-b border-gray-50">
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

                        <div class="pt-4 border-t border-slate-50">
                            <details class="group rounded-2xl border border-slate-100 bg-white overflow-hidden" ${hasPromo ? '' : 'open'}>
                                <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-3 px-4 py-3.5">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Daftar Media</p>
                                        <span class="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600">
                                            ${mediaList.length} file
                                        </span>
                                    </div>
                                    <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 group-open:rotate-180">
                                        <i class="ri-arrow-down-s-line text-lg"></i>
                                    </div>
                                </summary>
                                <div class="px-4 pb-4 border-t border-slate-100">
                                    <div class="pt-4 space-y-3">
                                        ${mediaMarkup}
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function bindPreviewButtons() {
        document.querySelectorAll('.btn-preview').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const media = btn.dataset.preview;
                const title = btn.dataset.title || 'Preview Media';
                const filename = btn.dataset.filename || title;

                if (!media) {
                    showDownloadInfo();
                    return;
                }

                await openPreviewModal(media, title, filename);
            });
        });
    }

    function bindDownloadButtons() {
        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const media = btn.dataset.media;
                const title = btn.dataset.title || 'promo';

                if (!media) {
                    showDownloadInfo();
                    return;
                }

                await withButtonLoading(btn, 'Mengunduh...', async () => {
                    await downloadWithAuth(media, `${slugify(title)}-promo`);
                });
            });
        });
    }

    function createPreviewModal() {
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = `
            <div id="promo-preview-modal" class="fixed inset-0 z-[2100] hidden">
                <div class="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" data-preview-close></div>
                <div class="relative min-h-screen flex items-center justify-center p-4">
                    <div class="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        <div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div class="min-w-0">
                                <p class="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Preview Media</p>
                                <h3 id="promo-preview-title" class="mt-1 truncate text-lg font-bold text-slate-900 font-poppins">Preview</h3>
                            </div>
                            <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors" data-preview-close aria-label="Tutup preview">
                                <i class="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        <div class="bg-slate-100 p-4 sm:p-6">
                            <div class="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-white">
                                <div id="promo-preview-loading" class="flex flex-col items-center gap-3 text-slate-500">
                                    <svg class="h-10 w-10 animate-spin text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    <p class="text-sm font-medium">Memuat preview...</p>
                                </div>
                                <img id="promo-preview-image" alt="Preview media promosi" class="hidden max-h-[70vh] w-auto max-w-full object-contain">
                                <div id="promo-preview-error" class="hidden max-w-md px-6 py-10 text-center">
                                    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                                        <i class="ri-image-line text-2xl"></i>
                                    </div>
                                    <p class="mt-4 text-base font-semibold text-slate-900">Preview tidak tersedia</p>
                                    <p class="mt-2 text-sm text-slate-500">File media tidak bisa ditampilkan saat ini. Anda tetap bisa mengunduh file promosi ini.</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                            <button type="button" id="promo-preview-download" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-[0.98]">
                                <i class="ri-download-2-line text-lg"></i>
                                <span class="btn-download-label">Unduh Media</span>
                            </button>
                            <button type="button" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-200" data-preview-close>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalWrapper.firstElementChild);

        const modal = document.getElementById('promo-preview-modal');
        const image = document.getElementById('promo-preview-image');
        const loading = document.getElementById('promo-preview-loading');
        const error = document.getElementById('promo-preview-error');
        const title = document.getElementById('promo-preview-title');
        const download = document.getElementById('promo-preview-download');

        modal.querySelectorAll('[data-preview-close]').forEach(btn => {
            btn.addEventListener('click', closePreviewModal);
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
                closePreviewModal();
            }
        });

        previewModalElements = { modal, image, loading, error, title, download };
    }

    async function openPreviewModal(url, title, filenameBase) {
        if (!previewModalElements) return;

        const { modal, image, loading, error, download, title: titleEl } = previewModalElements;
        const resolvedUrl = resolveMediaUrl(url);
        titleEl.textContent = title;
        loading.classList.remove('hidden');
        error.classList.add('hidden');
        image.classList.add('hidden');
        image.removeAttribute('src');

        download.disabled = false;
        download.classList.remove('opacity-50', 'cursor-not-allowed');
        download.onclick = async () => {
            await withButtonLoading(download, 'Mengunduh...', async () => {
                await downloadWithAuth(url, `${slugify(filenameBase)}-promo`);
            });
        };

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        try {
            const objectUrl = await fetchMediaObjectUrl(resolvedUrl);
            cleanupPreviewObjectUrl();
            previewObjectUrl = objectUrl;
            image.src = objectUrl;
            image.classList.remove('hidden');
        } catch (errorFetch) {
            console.error('preview failed', errorFetch);
            try {
                await loadImageWithFallback(image, resolvedUrl);
                image.classList.remove('hidden');
            } catch (fallbackError) {
                console.error('preview fallback failed', fallbackError);
                error.classList.remove('hidden');
            }
        } finally {
            loading.classList.add('hidden');
        }
    }

    function closePreviewModal() {
        if (!previewModalElements) return;
        const { modal, image, loading, error, download } = previewModalElements;
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        image.classList.add('hidden');
        image.removeAttribute('src');
        loading.classList.remove('hidden');
        error.classList.add('hidden');
        download.onclick = null;
        cleanupPreviewObjectUrl();
    }

    async function fetchMediaObjectUrl(resolvedUrl) {
        const headers = { Authorization: `Bearer ${window.apiToken}` };
        const resp = await fetch(resolvedUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
    }

    function loadImageWithFallback(imageEl, resolvedUrl) {
        return new Promise((resolve, reject) => {
            const onLoad = () => {
                cleanup();
                resolve();
            };

            const onError = () => {
                cleanup();
                reject(new Error('Image fallback failed'));
            };

            const cleanup = () => {
                imageEl.removeEventListener('load', onLoad);
                imageEl.removeEventListener('error', onError);
            };

            imageEl.addEventListener('load', onLoad, { once: true });
            imageEl.addEventListener('error', onError, { once: true });
            imageEl.src = resolvedUrl;
        });
    }

    function resolveMediaUrl(url) {
        return url.startsWith('/') ? `${window.baseUrl}${url}` : url;
    }

    async function withButtonLoading(button, loadingText, action) {
        if (!button) {
            await action();
            return;
        }

        const label = button.querySelector('.btn-download-label');
        const icon = button.querySelector('i');
        const originalLabel = label ? label.textContent : '';
        const originalIconClass = icon ? icon.className : '';

        button.disabled = true;
        button.classList.add('opacity-70', 'cursor-wait');

        if (label) label.textContent = loadingText;
        if (icon) icon.className = 'ri-loader-4-line text-lg animate-spin';

        try {
            await action();
        } finally {
            button.disabled = false;
            button.classList.remove('opacity-70', 'cursor-wait');
            if (label) label.textContent = originalLabel;
            if (icon) icon.className = originalIconClass;
        }
    }

    function cleanupPreviewObjectUrl() {
        if (!previewObjectUrl) return;
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = '';
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
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function slugify(s) {
        return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    async function downloadWithAuth(url, filenameBase) {
        try {
            const headers = { Authorization: `Bearer ${window.apiToken}` };
            const resolvedUrl = resolveMediaUrl(url);
            const resp = await fetch(resolvedUrl, { headers });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const blob = await resp.blob();
            const ext = getFileExtension(resolvedUrl, resp.headers.get('content-type'));
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

    function getFileExtension(url, contentType) {
        const cleanUrl = (url || '').split('?')[0];
        const fromUrl = cleanUrl.includes('.') ? cleanUrl.split('.').pop() : '';
        if (fromUrl) return fromUrl.toLowerCase();

        const fromType = (contentType || '').split('/').pop() || '';
        return fromType || 'bin';
    }
});
