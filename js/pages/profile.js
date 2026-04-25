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
    const boothRegionBaseUrl = 'https://region.katib.cloud';
    const boothRegionSearchToken = '0f4d99ae56bf938a9dc29d4f4dc499b919e44f4d3774cf2e5c7b9f5395d05fc6';
    const boothRegionOwnerId = '4427';
    const boothGeocodeBaseUrl = 'https://nominatim.openstreetmap.org/search';
    let boothRegionSearchTimer = null;
    let boothRegionSearchSeq = 0;
    let boothGeocodeSeq = 0;

    // Note: logout modal/handlers are provided globally by `components.js`.

    window.openEditProfileModal = function () {
        const modal = document.getElementById('edit-profile-modal');
        if (modal && window.currentProfileDetail) {
            const d = window.currentProfileDetail;
            document.getElementById('edit-nama').value = d.nama || '';
            document.getElementById('edit-whatsapp').value = d.whatsapp || '';
            document.getElementById('edit-email').value = d.email || '';
            document.getElementById('edit-alamat').value = d.alamat || '';
            document.getElementById('edit-nik').value = d.nik || '';
            // Populate additional fields
            try {
                const membership = document.getElementById('edit-membership');
                const website = document.getElementById('edit-website');
                const npwp = document.getElementById('edit-npwp');
                if (membership) membership.value = d.no_membership || '';
                if (website) website.value = d.website || '';
                if (npwp) npwp.value = d.no_npwp || '';
            } catch (e) {
                console.debug('Error populating extra fields');
            }

            // Populate region-related fields if present
            try {
                const rid = document.getElementById('edit-region-id');
                const rname = document.getElementById('edit-region');
                const kel = document.getElementById('edit-kelurahan');
                const kec = document.getElementById('edit-kecamatan');
                const kot = document.getElementById('edit-kota');
                const prov = document.getElementById('edit-provinsi');
                const kode = document.getElementById('edit-kodepos');
                if (rid) rid.value = d.region_id || '';
                if (rname) rname.value = d.region_name || d.region || '';
                if (kel) kel.value = d.kelurahan || '';
                if (kec) kec.value = d.kecamatan || '';
                if (kot) kot.value = d.kota || '';
                if (prov) prov.value = d.provinsi || '';
                if (kode) kode.value = d.kode_pos || d.kodepos || '';
            } catch (e) {
                console.debug('No region fields in edit modal yet');
            }

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

            initializeProfileRegionSearch();
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
        try {
            // Handle numeric timestamps (seconds or milliseconds)
            let date;
            if (typeof dateString === 'number' || /^\d+$/.test(String(dateString))) {
                let n = Number(dateString);
                // if value looks like seconds (10 digits), convert to ms
                if (n > 0 && n < 1e12) n = n * 1000;
                date = new Date(n);
            } else {
                const s = String(dateString).trim();
                // Guard against zero-dates or obvious invalids
                if (s === '' || s.startsWith('0000')) return '-';
                date = new Date(s);
            }

            if (!date || isNaN(date.getTime())) return '-';

            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch (err) {
            return '-';
        }
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

        // --- Populate booth category; booth map will initialize when the booth tab is opened ---
        populateBoothCategorySelect(detail);
    }

    // Populate category select for booth form
    function populateBoothCategorySelect(detail = {}) {
        const select = document.getElementById('booth-category');
        if (!select) return;
        select.innerHTML = '<option value="">Pilih kategori</option>';

        const cats = (detail.business_categories && detail.business_categories.length) ? detail.business_categories : [];
        cats.forEach(cat => {
            const opt = document.createElement('option');
            // Prefer `business_category_id` when present, fall back to `id`.
            const catId = (typeof cat.business_category_id !== 'undefined' && cat.business_category_id !== null)
                ? cat.business_category_id
                : ((typeof cat.id !== 'undefined' && cat.id !== null) ? cat.id : null);
            opt.value = catId !== null ? String(catId) : (cat.business_category || cat.code || '');
            opt.textContent = cat.business_category || cat.name || cat.business_category || '';
            if (catId !== null) opt.dataset.catId = String(catId);
            select.appendChild(opt);
        });

        // If profile has a default booth category, try to select it
        if (detail.default_booth_category) {
            select.value = detail.default_booth_category;
        }
    }

    function clearBoothRegionFields() {
        const ids = ['booth-region-id', 'booth-kelurahan', 'booth-kecamatan', 'booth-kota', 'booth-provinsi', 'booth-kodepos'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    function hideBoothRegionResults() {
        const resultsEl = document.getElementById('booth-region-results');
        if (!resultsEl) return;
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
    }

    function setBoothGeocodeLoading(isLoading) {
        const loadingEl = document.getElementById('booth-geocode-loading');
        if (!loadingEl) return;
        loadingEl.classList.toggle('hidden', !isLoading);
    }

    function applyBoothRegion(region) {
        if (!region) return;

        const mappings = {
            'booth-region-id': region.region_id || '',
            'booth-kelurahan': region.kelurahan || '',
            'booth-kecamatan': region.kecamatan || '',
            'booth-kota': region.kota || '',
            'booth-provinsi': region.provinsi || '',
            'booth-kodepos': region.kode_pos || ''
        };

        Object.entries(mappings).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        const searchEl = document.getElementById('booth-region-search');
        if (searchEl) searchEl.value = region.region_name || '';

        // Do not automatically overwrite the booth address input when a region
        // is applied. Keep region fields populated but leave `booth-address`
        // to be filled manually by the user to avoid unwanted autofill.

        hideBoothRegionResults();
        geocodeAndApplyBoothRegion(region);
    }

    async function geocodeAndApplyBoothRegion(region) {
        const currentSeq = ++boothGeocodeSeq;
        const queryParts = [region.kelurahan, region.kecamatan, region.kota, region.provinsi, 'Indonesia']
            .filter(Boolean);
        if (!queryParts.length) return;

        const boothLatEl = document.getElementById('booth-lat');
        const boothLngEl = document.getElementById('booth-lng');
        setBoothGeocodeLoading(true);

        try {
            const query = queryParts.join(', ');
            const response = await fetch(`${boothGeocodeBaseUrl}?format=jsonv2&limit=1&countrycodes=id&q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-store',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            if (currentSeq !== boothGeocodeSeq) return;
            if (!Array.isArray(results) || !results.length) return;

            const lat = parseFloat(results[0].lat);
            const lng = parseFloat(results[0].lon);
            if (isNaN(lat) || isNaN(lng)) return;

            if (boothLatEl) boothLatEl.value = lat.toString();
            if (boothLngEl) boothLngEl.value = lng.toString();

            if (typeof window.setBoothMarkerFromRegion === 'function') {
                window.setBoothMarkerFromRegion(lat, lng);
            }
        } catch (error) {
            console.error('Gagal geocode wilayah booth:', error);
        } finally {
            if (currentSeq === boothGeocodeSeq) {
                setBoothGeocodeLoading(false);
            }
        }
    }

    function renderBoothRegionResults(regions = []) {
        const resultsEl = document.getElementById('booth-region-results');
        if (!resultsEl) return;

        if (!regions.length) {
            resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">Wilayah tidak ditemukan.</div>';
            resultsEl.classList.remove('hidden');
            return;
        }

        resultsEl.innerHTML = regions.map(region => `
            <button type="button"
                class="booth-region-option w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-neutral-100 last:border-b-0"
                data-region='${JSON.stringify(region).replace(/'/g, '&apos;')}'>
                <div class="text-sm font-semibold text-slate-900">${escapeHtml(region.region_name || '-')}</div>
                <div class="mt-1 text-xs text-slate-500">${escapeHtml([region.kelurahan, region.kecamatan, region.kota, region.provinsi, region.kode_pos].filter(Boolean).join(' • '))}</div>
            </button>
        `).join('');
        resultsEl.classList.remove('hidden');

        resultsEl.querySelectorAll('.booth-region-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const raw = btn.getAttribute('data-region')?.replace(/&apos;/g, "'");
                if (!raw) return;
                try {
                    applyBoothRegion(JSON.parse(raw));
                } catch (error) {
                    console.error('Failed parsing region data:', error);
                }
            });
        });
    }

    async function searchBoothRegion(query) {
        const resultsEl = document.getElementById('booth-region-results');
        if (!resultsEl) return;

        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 3) {
            hideBoothRegionResults();
            clearBoothRegionFields();
            return;
        }

        const currentSeq = ++boothRegionSearchSeq;
        resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">Mencari wilayah...</div>';
        resultsEl.classList.remove('hidden');

        try {
            const endpoint = `${boothRegionBaseUrl}/table/region/${boothRegionOwnerId}/1?search=${encodeURIComponent(normalizedQuery)}`;
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${boothRegionSearchToken}`,
                    'Accept': 'application/json'
                },
                cache: 'no-store',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (currentSeq !== boothRegionSearchSeq) return;

            renderBoothRegionResults(Array.isArray(data.tableData) ? data.tableData : []);
        } catch (error) {
            console.error('Gagal mencari wilayah booth:', error);
            if (currentSeq !== boothRegionSearchSeq) return;
            resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-red-500">Gagal memuat data wilayah.</div>';
            resultsEl.classList.remove('hidden');
        }
    }

    function initializeBoothRegionSearch() {
        const searchEl = document.getElementById('booth-region-search');
        if (!searchEl || searchEl.dataset.bound === 'true') return;

        searchEl.dataset.bound = 'true';
        searchEl.addEventListener('input', () => {
            const query = searchEl.value;
            if (boothRegionSearchTimer) clearTimeout(boothRegionSearchTimer);
            boothRegionSearchTimer = setTimeout(() => {
                searchBoothRegion(query);
            }, 350);
        });

        searchEl.addEventListener('focus', () => {
            if (searchEl.value.trim().length >= 3) {
                searchBoothRegion(searchEl.value);
            }
        });

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById('booth-region-results');
            if (!wrapper || !searchEl) return;
            if (wrapper.contains(event.target) || searchEl.contains(event.target)) return;
            hideBoothRegionResults();
        });
    }

    // --- Profile modal region search (similar to booth region search) ---
    async function searchProfileRegion(query) {
        const resultsEl = document.getElementById('edit-region-results');
        if (!resultsEl) return;

        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 3) {
            hideProfileRegionResults();
            return;
        }

        resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">Mencari wilayah...</div>';
        resultsEl.classList.remove('hidden');

        try {
            const endpoint = `${boothRegionBaseUrl}/table/region/${boothRegionOwnerId}/1?search=${encodeURIComponent(normalizedQuery)}`;
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${boothRegionSearchToken}`,
                    'Accept': 'application/json'
                },
                cache: 'no-store',
                credentials: 'omit'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            renderProfileRegionResults(Array.isArray(data.tableData) ? data.tableData : []);
        } catch (err) {
            console.error('Gagal mencari wilayah (profile):', err);
            resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-red-500">Gagal memuat data wilayah.</div>';
            resultsEl.classList.remove('hidden');
        }
    }

    function hideProfileRegionResults() {
        const resultsEl = document.getElementById('edit-region-results');
        if (!resultsEl) return;
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
    }

    function renderProfileRegionResults(regions = []) {
        const resultsEl = document.getElementById('edit-region-results');
        if (!resultsEl) return;

        if (!regions.length) {
            resultsEl.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">Wilayah tidak ditemukan.</div>';
            resultsEl.classList.remove('hidden');
            return;
        }

        resultsEl.innerHTML = regions.map(region => {
            const safe = (str) => String(str || '').replace(/'/g, "&apos;");
            const regionTitle = region.region_name || `${region.provinsi || ''} ${region.kota || ''} ${region.kecamatan || ''} ${region.kelurahan || ''}`.trim();
            const regionSubtitle = region.region_name ? `${region.provinsi || ''} • ${region.kota || ''} • ${region.kecamatan || ''} • ${region.kelurahan || ''}`.trim() : '';

            return `<button type="button" class="profile-region-option text-left w-full px-4 py-3 hover:bg-slate-50 border-b last:border-b-0" data-region='${safe(JSON.stringify(region))}'>
                        <div class="text-sm text-slate-700 font-medium">${escapeHtml(regionTitle)}</div>
                        ${regionSubtitle ? `<div class="text-xs text-slate-400 mt-1">${escapeHtml(regionSubtitle)}</div>` : ''}
                    </button>`;
        }).join('');

        resultsEl.classList.remove('hidden');

        resultsEl.querySelectorAll('.profile-region-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const raw = btn.getAttribute('data-region')?.replace(/&apos;/g, "'");
                if (!raw) return;
                try {
                    applyProfileRegion(JSON.parse(raw));
                } catch (error) {
                    console.error('Failed parsing profile region data:', error);
                }
            });
        });
    }

    function applyProfileRegion(region) {
        if (!region) return;
        const mappings = {
            'edit-region-id': region.region_id || '',
            'edit-kelurahan': region.kelurahan || '',
            'edit-kecamatan': region.kecamatan || '',
            'edit-kota': region.kota || '',
            'edit-provinsi': region.provinsi || '',
            'edit-kodepos': region.kode_pos || ''
        };

        Object.entries(mappings).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        const searchEl = document.getElementById('edit-region');
        if (searchEl) searchEl.value = region.region_name || '';

        hideProfileRegionResults();
    }

    function initializeProfileRegionSearch() {
        const searchEl = document.getElementById('edit-region');
        if (!searchEl || searchEl.dataset.bound === 'true') return;
        searchEl.dataset.bound = 'true';

        let timer = null;
        searchEl.addEventListener('input', () => {
            const q = searchEl.value || '';
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => searchProfileRegion(q), 350);
        });

        searchEl.addEventListener('focus', () => {
            if (searchEl.value.trim().length >= 3) searchProfileRegion(searchEl.value);
        });

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById('edit-region-results');
            if (!wrapper || !searchEl) return;
            if (wrapper.contains(event.target) || searchEl.contains(event.target)) return;
            hideProfileRegionResults();
        });
    }

    // Booth map/editor state
    let boothMap = null;
    let boothMarker = null;

    function refreshBoothMapLayout() {
        if (!boothMap) return;

        // Delay a bit so the container has its final visible size before Leaflet recalculates tiles.
        [0, 150, 300].forEach(delay => {
            setTimeout(() => {
                boothMap.invalidateSize();
                if (boothMarker) {
                    boothMap.panTo(boothMarker.getLatLng());
                }
            }, delay);
        });
    }

    function initBoothEditor(detail = {}) {
        const mapEl = document.getElementById('boothMap');
        const panelBooth = document.getElementById('panel-booth');
        console.debug('[BOOTH EDITOR] initBoothEditor called, mapEl exists:', !!mapEl, ', L defined:', typeof window.L !== 'undefined', ', panel visible:', panelBooth && !panelBooth.classList.contains('hidden'));
        if (!mapEl || typeof window.L === 'undefined') return;

        // Ensure panel is visible before initializing map (Leaflet needs dimensions)
        if (panelBooth && panelBooth.classList.contains('hidden')) {
            console.debug('[BOOTH EDITOR] panel hidden, deferring init');
            return;
        }

        initializeBoothRegionSearch();
        initializeProfileRegionSearch();

        // If already initialized, skip
        if (boothMap) {
            refreshBoothMapLayout();
            return;
        }

        // Default center: Jakarta
        const defaultCenter = [-6.200000, 106.816666];
        let lat = parseFloat(detail.booth_lat) || null;
        let lng = parseFloat(detail.booth_lng) || null;

        // Use a maxZoom compatible with the chosen tile provider. OpenStreetMap
        // standard tiles are served up to z=19; requesting z>19 returns 400
        // from the tile server. If you need true detail above z=19, switch to
        // a provider that supplies higher-zoom tiles (Mapbox, commercial tiles,
        // or vector tiles).
        const providerMaxZoom = 19;
        boothMap = window.L.map(mapEl, { scrollWheelZoom: true, maxZoom: providerMaxZoom }).setView(lat && lng ? [lat, lng] : defaultCenter, lat && lng ? 14 : 5);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: providerMaxZoom
        }).addTo(boothMap);

        function setMarkerAt(latv, lngv, pan = true) {
            if (!latv || !lngv || isNaN(latv) || isNaN(lngv)) return;
            const latf = parseFloat(latv);
            const lngf = parseFloat(lngv);
            if (!boothMarker) {
                console.debug('[BOOTH MAP] creating marker at', latf, lngf);
                boothMarker = window.L.marker([latf, lngf], { draggable: true }).addTo(boothMap);
                boothMarker.on('dragend', (e) => {
                    const p = e.target.getLatLng();
                    console.debug('[BOOTH MAP] marker dragged to', p.lat, p.lng);
                    setInputsFromMarker(p.lat, p.lng);
                });
            } else {
                boothMarker.setLatLng([latf, lngf]);
            }
            if (pan) boothMap.setView([latf, lngf], boothMap.getMaxZoom());
        }

        window.setBoothMarkerFromRegion = (latv, lngv) => {
            setMarkerAt(latv, lngv, true);
            setInputsFromMarker(latv, lngv);
        };

        function setInputsFromMarker(latv, lngv) {
            const latInput = document.getElementById('booth-lat');
            const lngInput = document.getElementById('booth-lng');
            const lv = (Math.round((latv + Number.EPSILON) * 1000000) / 1000000).toString();
            const lgv = (Math.round((lngv + Number.EPSILON) * 1000000) / 1000000).toString();
            console.debug('[BOOTH MAP] setInputsFromMarker', lv, lgv);
            if (latInput) latInput.value = lv;
            if (lngInput) lngInput.value = lgv;
        }

        // If profile already has booth coords, place marker
        if (lat && lng) {
            setMarkerAt(lat, lng, true);
            setInputsFromMarker(lat, lng);
        }

        // Click on map to move marker
        boothMap.on('click', function (e) {
            const p = e.latlng;
            console.debug('[BOOTH MAP] map clicked at', p.lat, p.lng);
            setMarkerAt(p.lat, p.lng, false);
            setInputsFromMarker(p.lat, p.lng);
        });

        // Inputs update marker on blur
        const latInput = document.getElementById('booth-lat');
        const lngInput = document.getElementById('booth-lng');
        if (latInput && lngInput) {
            const updateMarkerFromInputs = () => {
                const vlat = parseFloat(latInput.value);
                const vlng = parseFloat(lngInput.value);
                if (!isNaN(vlat) && !isNaN(vlng)) {
                    setMarkerAt(vlat, vlng, true);
                }
            };
            latInput.addEventListener('change', updateMarkerFromInputs);
            lngInput.addEventListener('change', updateMarkerFromInputs);
        }

        // Reset button
        const btnReset = document.getElementById('btn-reset-booth');
        if (btnReset) btnReset.addEventListener('click', () => {
            document.getElementById('booth-name').value = '';
            document.getElementById('booth-address').value = '';
            document.getElementById('booth-region-search').value = '';
            document.getElementById('booth-lat').value = '';
            document.getElementById('booth-lng').value = '';
            clearBoothRegionFields();
            hideBoothRegionResults();
            if (boothMarker) {
                boothMap.removeLayer(boothMarker);
                boothMarker = null;
            }
            boothMap.setView(defaultCenter, 5);
        });

        // Save button
        const btnSave = document.getElementById('btn-save-booth');
        if (btnSave) btnSave.addEventListener('click', async () => {
            const categoryValue = document.getElementById('booth-category').value;
            const categorySelect = document.getElementById('booth-category');
            const selectedOption = categorySelect ? categorySelect.options[categorySelect.selectedIndex] : null;
            const businessCategoryId = selectedOption && selectedOption.dataset && selectedOption.dataset.catId ? parseInt(selectedOption.dataset.catId, 10) : (Number.isFinite(Number(categoryValue)) ? parseInt(categoryValue, 10) : null);

            const name = document.getElementById('booth-name').value.trim();
            const address = document.getElementById('booth-address').value.trim();
            const vlat = parseFloat((document.getElementById('booth-lat').value || '').trim());
            const vlng = parseFloat((document.getElementById('booth-lng').value || '').trim());
            const regionIdEl = document.getElementById('booth-region-id');
            const regionId = regionIdEl ? (regionIdEl.value || regionIdEl.textContent || '') : '';

            if (!name) return profileToast('warning', 'Masukkan nama booth.');
            if (!businessCategoryId) return profileToast('warning', 'Pilih kategori bisnis.');
            if (isNaN(vlat) || isNaN(vlng)) return profileToast('warning', 'Koordinat tidak valid. Pilih lokasi di peta.');

            // Determine owner_id: prefer configured boothRegionOwnerId, fallback to user owner fields
            const ownerId = boothRegionOwnerId || (user && (user.owner_id || user.ownerId || user.ownerid)) || '';

            const payload = {
                owner_id: Number(ownerId) || ownerId,
                pelanggan_id: Number(customerId) || customerId,
                business_category_id: Number(businessCategoryId),
                region_id: regionId ? Number(regionId) : null,
                booth_name: name,
                booth_address: address,
                lat: vlat,
                lng: vlng
            };

            btnSave.disabled = true;
            const orig = btnSave.innerHTML;
            btnSave.innerHTML = 'Menyimpan...';

            try {
                const resp = await fetch(`${window.baseUrl}/add/client_sales_coordinate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${window.apiToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);

                profileToast('success', data.message || 'Titik jualan berhasil disimpan.');
                await fetchProfileData();
            } catch (err) {
                console.error('Gagal menyimpan booth:', err);
                profileToast('error', err.message || 'Gagal menyimpan titik jualan.');
            } finally {
                btnSave.disabled = false;
                btnSave.innerHTML = orig;
            }
        });

        refreshBoothMapLayout();
    }

    window.initBoothEditor = initBoothEditor;
    window.refreshBoothMapLayout = refreshBoothMapLayout;

    // --- Booth list handling ---
    // Fetch booth list from the server using the table API with pagination and optional search
    async function fetchBoothList(page = 1, q = '') {
        const tableBody = document.querySelector('#booth-list-table tbody');
        const paginationEl = document.getElementById('booth-list-pagination');
        if (!tableBody) return [];
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">Memuat data titik outlet...</td></tr>';
        if (paginationEl) paginationEl.innerHTML = '';

        try {
            const url = `${window.baseUrl}/table/client_sales_coordinate/${customerId}/${page}${q ? `?search=${encodeURIComponent(q)}` : ''}`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${window.apiToken}`, 'Content-Type': 'application/json' } });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            const items = Array.isArray(data.tableData) ? data.tableData : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));

            // Robust extraction of totalRecords from multiple possible property names
            let totalRecords = null;
            const totalCandidates = ['totalRecords', 'total_records', 'total', 'count', 'totalCount', 'recordsTotal'];
            for (const key of totalCandidates) {
                if (typeof data[key] !== 'undefined' && data[key] !== null) {
                    totalRecords = Number(data[key]);
                    break;
                }
            }
            if (!Number.isFinite(totalRecords)) totalRecords = items.length || 0;

            // Determine per-page size if available
            let perPage = null;
            const perPageCandidates = ['per_page', 'perPage', 'limit', 'pageSize', 'page_size', 'perPageCount'];
            for (const key of perPageCandidates) {
                if (typeof data[key] !== 'undefined' && data[key] !== null) {
                    perPage = Number(data[key]);
                    break;
                }
            }
            if (!Number.isFinite(perPage) || perPage <= 0) perPage = items.length || 10;

            // Robust extraction of totalPages from multiple possible property names
            let totalPages = null;
            const pageCandidates = ['totalPages', 'total_pages', 'last_page', 'lastPage', 'pages', 'pageCount'];
            for (const key of pageCandidates) {
                if (typeof data[key] !== 'undefined' && data[key] !== null) {
                    totalPages = Number(data[key]);
                    break;
                }
            }
            if (!Number.isFinite(totalPages) || totalPages <= 0) {
                if (Number.isFinite(totalRecords) && Number.isFinite(perPage) && perPage > 0) {
                    totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
                } else {
                    totalPages = 1;
                }
            }

            renderBoothTable(items, totalPages, page, totalRecords);
            return items;
        } catch (err) {
            console.error('Gagal memuat daftar titik outlet:', err);
            // Fallback to empty state
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">Tidak ada data titik outlet.</td></tr>';
            return [];
        }
    }

    function renderBoothTable(items, totalPages = 1, currentPage = 1, totalRecords = 0) {
        const tableBody = document.querySelector('#booth-list-table tbody');
        const paginationEl = document.getElementById('booth-list-pagination');
        if (!tableBody) return;
        if (!items || !items.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-400">Belum ada titik outlet.</td></tr>';
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }
        // determine page size from totalRecords / totalPages when available
        const pageSize = (totalPages && totalPages > 0) ? Math.max(1, Math.ceil(totalRecords / totalPages)) : items.length || 10;
        tableBody.innerHTML = items.map((b, idx) => {
            const name = b.booth_name || b.nama || b.name || '-';
            const cat = b.business_category || b.category || '-';
            const addr = b.booth_address || b.address || b.alamat || '-';
            const region = b.region_name || b.region || '-';
            const status = b.status || b.status_text || b.status_label || '-';
            const lat = (b.lat || b.latitude || b.booth_lat) || '-';
            const lng = (b.lng || b.longitude || b.booth_lng) || '-';
            const rowNum = (currentPage - 1) * pageSize + idx + 1;
            return `
                <tr class="border-t">
                    <td class="px-3 py-2 align-top">${rowNum}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(name)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(cat)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(addr)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(region)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(status)}</td>
                </tr>
            `;
        }).join('');

        // Render simple pagination
        if (paginationEl) {
            paginationEl.innerHTML = '';
            const pages = Number.isFinite(Number(totalPages)) ? Number(totalPages) : 1;
            if (pages >= 1) {
                const wrap = document.createElement('div');
                wrap.className = 'mt-3 flex items-center justify-center gap-2';

                const prev = document.createElement('button');
                prev.className = 'px-3 py-1 rounded bg-slate-100';
                prev.textContent = 'Prev';
                prev.disabled = currentPage <= 1;
                prev.addEventListener('click', () => fetchBoothList(currentPage - 1, (boothListSearchInput && boothListSearchInput.value) || ''));
                wrap.appendChild(prev);

                // show up to 5 page buttons
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(pages, start + 4);
                for (let p = start; p <= end; p++) {
                    const btn = document.createElement('button');
                    btn.className = `px-3 py-1 rounded ${p === currentPage ? 'bg-red-600 text-white' : 'bg-white border border-slate-200'}`;
                    btn.textContent = String(p);
                    btn.addEventListener('click', () => fetchBoothList(p, (boothListSearchInput && boothListSearchInput.value) || ''));
                    wrap.appendChild(btn);
                }

                const next = document.createElement('button');
                next.className = 'px-3 py-1 rounded bg-slate-100';
                next.textContent = 'Next';
                next.disabled = currentPage >= pages;
                next.addEventListener('click', () => fetchBoothList(currentPage + 1, (boothListSearchInput && boothListSearchInput.value) || ''));
                wrap.appendChild(next);

                paginationEl.appendChild(wrap);
            }
        }

        // wire up pilih buttons
        document.querySelectorAll('.btn-focus-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lat = parseFloat(e.currentTarget.dataset.lat);
                const lng = parseFloat(e.currentTarget.dataset.lng);
                const name = e.currentTarget.dataset.name;
                // switch to editor tab
                showEditorTab();
                document.getElementById('booth-name').value = name || '';
                document.getElementById('booth-lat').value = isNaN(lat) ? '' : lat;
                document.getElementById('booth-lng').value = isNaN(lng) ? '' : lng;
                if (boothMap && !isNaN(lat) && !isNaN(lng)) {
                    boothMap.setView([lat, lng], 16);
                    if (typeof boothMarker !== 'undefined' && boothMarker) {
                        boothMarker.setLatLng([lat, lng]);
                    }
                }
            });
        });
    }

    window.escapeHtml = function (s) {
        if (!s && s !== 0) return '';
        return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]); });
    };

    window.escapeAttr = function (s) { return (s || '').replace(/"/g, '&quot;'); };

    // Tab switching
    function showEditorTab() {
        document.getElementById('tab-editor-panel').classList.remove('hidden');
        document.getElementById('tab-list-panel').classList.add('hidden');
        document.getElementById('tab-editor').classList.add('bg-white');
        document.getElementById('tab-list').classList.remove('bg-white');
        refreshBoothMapLayout();
    }
    function showListTab() {
        document.getElementById('tab-editor-panel').classList.add('hidden');
        document.getElementById('tab-list-panel').classList.remove('hidden');
        document.getElementById('tab-list').classList.add('bg-white');
        document.getElementById('tab-editor').classList.remove('bg-white');
        // load list when opening, preserve search
        const q = (document.getElementById('booth-list-search') && document.getElementById('booth-list-search').value) || '';
        fetchBoothList(1, q);
    }

    // wire tab buttons (already inside DOMContentLoaded handler)
    const tEditor = document.getElementById('tab-editor');
    const tList = document.getElementById('tab-list');
    if (tEditor) tEditor.addEventListener('click', showEditorTab);
    if (tList) tList.addEventListener('click', showListTab);

    // Booth list search handling (debounced)
    let boothListSearchTimer = null;
    const boothListSearchInput = document.getElementById('booth-list-search');
    if (boothListSearchInput) {
        boothListSearchInput.addEventListener('input', () => {
            const q = boothListSearchInput.value || '';
            if (boothListSearchTimer) clearTimeout(boothListSearchTimer);
            boothListSearchTimer = setTimeout(() => {
                fetchBoothList(1, q);
            }, 350);
        });
    }

    // refresh list after saving a booth
    const originalSaveWrap = document.getElementById('btn-save-booth');
    if (originalSaveWrap) {
        const old = originalSaveWrap.onclick; // not used but keep
        // intercept by observing fetchProfileData or after saving we already call fetchProfileData.
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

    window.profileToast = function (icon, message) {
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
    };


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
            // Build full payload by merging editable fields with current profile detail
            const detail = window.currentProfileDetail || {};
            const payload = {
                owner_id: window.ownerId || detail.owner_id || (user && user.owner_id) || null,
                region_id: (document.getElementById('edit-region-id') && document.getElementById('edit-region-id').value) ? parseInt(document.getElementById('edit-region-id').value) : (detail.region_id || null),
                religion_id: detail.religion_id || null,
                join_date: detail.join_date || null,
                nama: document.getElementById('edit-nama').value || detail.nama || '',
                alias: detail.alias || '',
                birth: document.getElementById('edit-birth').value || detail.birth || null,
                whatsapp: document.getElementById('edit-whatsapp').value || detail.whatsapp || '',
                email: document.getElementById('edit-email').value || detail.email || '',
                no_membership: document.getElementById('edit-membership').value || detail.no_membership || '',
                website: document.getElementById('edit-website').value || detail.website || '',
                nik: document.getElementById('edit-nik').value || detail.nik || '',
                no_npwp: document.getElementById('edit-npwp').value || detail.no_npwp || '',
                no_npwp_old: detail.no_npwp || '', // Keep for reference if needed
                alamat: document.getElementById('edit-alamat').value || detail.alamat || '',
                kelurahan: (document.getElementById('edit-kelurahan') && document.getElementById('edit-kelurahan').value) ? document.getElementById('edit-kelurahan').value : (detail.kelurahan || ''),
                kecamatan: (document.getElementById('edit-kecamatan') && document.getElementById('edit-kecamatan').value) ? document.getElementById('edit-kecamatan').value : (detail.kecamatan || ''),
                kota: (document.getElementById('edit-kota') && document.getElementById('edit-kota').value) ? document.getElementById('edit-kota').value : (detail.kota || ''),
                provinsi: (document.getElementById('edit-provinsi') && document.getElementById('edit-provinsi').value) ? document.getElementById('edit-provinsi').value : (detail.provinsi || ''),
                kode_pos: (document.getElementById('edit-kodepos') && document.getElementById('edit-kodepos').value) ? document.getElementById('edit-kodepos').value : (detail.kode_pos || detail.kodepos || ''),
                // business_category_ids: extract IDs from business_categories array in detail
                business_category_ids: Array.isArray(detail.business_categories)
                    ? detail.business_categories.map(c => c.business_category_id || c.id).filter(Boolean)
                    : (detail.business_category_id ? [detail.business_category_id] : [])
            };

            const originalText = btnSaveProfile.innerHTML;
            btnSaveProfile.disabled = true;
            btnSaveProfile.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...</span>';

            try {
                // Use the client's update endpoint
                const response = await fetch(`${window.baseUrl}/update/client/${customerId}`, {
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
    initializeProfileRegionSearch();
    fetchProfileData();
});

// --- Additional UI wiring for profile tabs & testimonials ---
document.addEventListener('DOMContentLoaded', () => {
    // Top-level tabs
    const tabContact = document.getElementById('tab-contact');
    const tabBooth = document.getElementById('tab-booth');
    const tabTesti = document.getElementById('tab-testimonial');

    function setActiveTab(button) {
        [tabContact, tabBooth, tabTesti].forEach(b => {
            if (!b) return;
            b.classList.remove('bg-red-600', 'text-white');
            b.classList.add('bg-slate-50', 'text-slate-700');
        });
        if (button) {
            button.classList.add('bg-red-600', 'text-white');
            button.classList.remove('bg-slate-50', 'text-slate-700');
        }
    }

    function showPanel(idKey) {
        // mapping of keys to panels (contact shows multiple)
        const mapping = {
            contact: ['panel-contact', 'panel-personal', 'panel-business'],
            booth: ['panel-booth'],
            testimonial: ['panel-testimonial']
        };

        // hide all panels first
        ['panel-contact', 'panel-personal', 'panel-business', 'panel-booth', 'panel-testimonial'].forEach(pid => {
            const el = document.getElementById(pid);
            if (!el) return; el.classList.add('hidden');
        });

        const toShow = mapping[idKey] || [];
        toShow.forEach(pid => {
            const el = document.getElementById(pid);
            if (el) el.classList.remove('hidden');
        });

        if (idKey === 'booth') {
            // Delay slightly to allow panel to become visible and acquire dimensions
            setTimeout(() => {
                if (window.initBoothEditor) window.initBoothEditor(window.currentProfileDetail || {});
                if (window.refreshBoothMapLayout) window.refreshBoothMapLayout();
            }, 100);
        }

        // update active styling
        if (idKey === 'contact') setActiveTab(tabContact);
        else if (idKey === 'booth') setActiveTab(tabBooth);
        else if (idKey === 'testimonial') setActiveTab(tabTesti);
    }

    if (tabContact) tabContact.addEventListener('click', () => showPanel('contact'));
    if (tabBooth) tabBooth.addEventListener('click', () => showPanel('booth'));
    if (tabTesti) tabTesti.addEventListener('click', () => { showPanel('testimonial'); fetchTestimonialList(); });

    // default show contact
    showPanel('contact');

    // Testimonial handlers
    const btnSaveTesti = document.getElementById('btn-save-testimonial');
    if (btnSaveTesti) btnSaveTesti.addEventListener('click', async () => {
        const body = document.getElementById('testi-body').value.trim();
        const rating = parseInt(document.getElementById('testi-rating').value) || 5;

        // resolve from session
        const _user = JSON.parse(localStorage.getItem('mki_user') || '{}');
        const customerId = _user.xustomer_id || _user.customer_id || _user.owner_id;
        const customerName = _user.nama || _user.name || 'User';

        if (!body) return profileToast('warning', 'Tuliskan isi testimoni Anda.');

        const payload = {
            pelanggan_id: Number(customerId),
            testimonial_name: customerName,
            testimonial_text: body,
            star_rating: rating
        };

        btnSaveTesti.disabled = true;
        const orig = btnSaveTesti.innerHTML;
        btnSaveTesti.innerHTML = 'Mengirim...';

        try {
            const resp = await fetch(`${window.baseUrl}/add/testimonial`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await resp.json().catch(() => ({}));

            if (resp.ok) {
                profileToast('success', data.message || 'Testimoni berhasil dikirim.');
                document.getElementById('testi-body').value = '';
                document.getElementById('testi-rating').value = '5';
                fetchTestimonialList();
                return;
            }

            throw new Error(data.message || 'Gagal mengirim testimoni.');
        } catch (e) {
            console.error('Testimonial error:', e);
            profileToast('error', e.message || 'Gagal mengirim testimoni.');
        } finally {
            btnSaveTesti.disabled = false;
            btnSaveTesti.innerHTML = orig;
        }
    });

});

async function fetchTestimonialList() {
    const listContainer = document.getElementById('testimonial-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<p class="text-slate-400 py-6 text-center sm:col-span-2">Memuat testimoni...</p>';

    // resolve clientId from session/localStorage
    const _user = JSON.parse(localStorage.getItem('mki_user') || '{}');
    const clientId = _user.owner_id || _user.client_id || _user.customer_id;

    if (!clientId) {
        listContainer.innerHTML = '<p class="text-slate-400 py-6 text-center sm:col-span-2">Client ID tidak ditemukan.</p>';
        return;
    }

    try {
        const resp = await fetch(`${window.baseUrl}/list/client_testimonial/${clientId}`, {
            headers: { 'Authorization': `Bearer ${window.apiToken}` }
        });
        if (!resp.ok) throw new Error('Gagal memuat testimoni');

        const data = await resp.json();
        const items = data && data.listData ? data.listData : [];
        renderTestimonials(items);
    } catch (e) {
        console.error('Fetch testimonials error:', e);
        listContainer.innerHTML = '<p class="text-slate-400 py-6 text-center sm:col-span-2">Gagal memuat testimoni dari server.</p>';
    }
}

function renderTestimonials(items) {
    const listContainer = document.getElementById('testimonial-list');
    if (!listContainer) return;

    if (!items || !items.length) {
        listContainer.innerHTML = '<p class="text-slate-400 py-6 text-center sm:col-span-2">Belum ada testimoni.</p>';
        return;
    }

    const renderStars = (rating) => {
        const r = parseInt(rating) || 0;
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= r) html += '<i class="ri-star-fill text-yellow-400"></i>';
            else html += '<i class="ri-star-line text-slate-300"></i>';
        }
        return html;
    };

    listContainer.innerHTML = items.map(t => {
        const name = t.testimonial_name || 'Anonim';
        const text = t.testimonial_text || t.body || '-';
        const rating = t.star_rating || t.rating || 0;
        const id = t.id || t.testimonial_id;

        return `
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3 relative group">
                <button onclick="window.deleteTestimonial(${id})" 
                    class="absolute top-3 right-3 text-slate-300 hover:text-red-600 transition-colors p-1"
                    title="Hapus Testimoni">
                    <i class="ri-delete-bin-line text-lg"></i>
                </button>
                <div class="flex justify-between items-start">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-900 text-sm">${escapeHtml(name)}</span>
                        <div class="flex gap-0.5 mt-1">
                            ${renderStars(rating)}
                        </div>
                    </div>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed pr-6">${escapeHtml(text)}</p>
            </div>
        `;
    }).join('');
}

let testimonialIdToDelete = null;

window.deleteTestimonial = function (id) {
    if (!id) return;
    testimonialIdToDelete = id;

    const modal = document.getElementById('delete-confirm-modal');
    const content = modal.querySelector('.inline-block');

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

const closeDeleteModal = () => {
    const modal = document.getElementById('delete-confirm-modal');
    const content = modal.querySelector('.inline-block');

    modal.classList.remove('opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    content.classList.remove('scale-100', 'opacity-100');

    setTimeout(() => {
        modal.classList.add('hidden');
        testimonialIdToDelete = null;
    }, 300);
};

// Bind modal buttons once
document.addEventListener('DOMContentLoaded', () => {
    const btnCancel = document.getElementById('btn-cancel-delete');
    const btnConfirm = document.getElementById('btn-confirm-delete');

    if (btnCancel) btnCancel.addEventListener('click', closeDeleteModal);
    if (btnConfirm) btnConfirm.addEventListener('click', async () => {
        if (!testimonialIdToDelete) return;

        const orig = btnConfirm.innerHTML;
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = 'Menghapus...';

        try {
            const resp = await fetch(`${window.baseUrl}/delete/client_testimonial/${testimonialIdToDelete}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${window.apiToken}` }
            });

            if (resp.ok) {
                profileToast('success', 'Testimoni berhasil dihapus.');
                closeDeleteModal();
                if (window.fetchTestimonialList) window.fetchTestimonialList();
            } else {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data.message || 'Gagal menghapus testimoni.');
            }
        } catch (e) {
            console.error('Delete error:', e);
            profileToast('error', e.message || 'Terjadi kesalahan saat menghapus.');
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = orig;
        }
    });
});




