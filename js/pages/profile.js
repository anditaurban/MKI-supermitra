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
        if (!mapEl || typeof window.L === 'undefined') return;
        initializeBoothRegionSearch();

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
                boothMarker = window.L.marker([latf, lngf], { draggable: true }).addTo(boothMap);
                boothMarker.on('moveend', (e) => {
                    const p = e.target.getLatLng();
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
            if (latInput) latInput.value = (Math.round((latv + Number.EPSILON) * 1000000) / 1000000).toString();
            if (lngInput) lngInput.value = (Math.round((lngv + Number.EPSILON) * 1000000) / 1000000).toString();
        }

        // If profile already has booth coords, place marker
        if (lat && lng) {
            setMarkerAt(lat, lng, true);
            setInputsFromMarker(lat, lng);
        }

        // Click on map to move marker
        boothMap.on('click', function (e) {
            const p = e.latlng;
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
    async function fetchBoothList() {
        const tableBody = document.querySelector('#booth-list-table tbody');
        if (!tableBody) return [];
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-400">Memuat data titik jualan...</td></tr>';

        const endpoints = [
            `${window.baseUrl}/list/booth/${customerId}`,
            `${window.baseUrl}/booth/client/${customerId}`,
            `${window.baseUrl}/client/${customerId}/booths`
        ];

        for (const url of endpoints) {
            try {
                const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${window.apiToken}` } });
                if (!resp.ok) continue;
                const data = await resp.json();
                const items = data && (data.items || data.data || data.booths || data) ? (data.items || data.data || data.booths || data) : [];
                renderBoothTable(Array.isArray(items) ? items : []);
                return items;
            } catch (e) {
                // try next
            }
        }

        // Fallback to localStorage if API not available
        try {
            const localKey = `mki_booths_${customerId}`;
            const raw = localStorage.getItem(localKey);
            const items = raw ? JSON.parse(raw) : [];
            renderBoothTable(items);
            return items;
        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-400">Tidak ada data titik jualan.</td></tr>';
            return [];
        }
    }

    function renderBoothTable(items) {
        const tableBody = document.querySelector('#booth-list-table tbody');
        if (!tableBody) return;
        if (!items || !items.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-400">Belum ada titik jualan.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map((b, idx) => {
            const name = b.name || b.booth_name || b.nama || '-';
            const cat = b.business_category || b.category || '-';
            const addr = b.address || b.alamat || '-';
            const lat = (b.lat || b.latitude || b.booth_lat) || '-';
            const lng = (b.lng || b.longitude || b.booth_lng) || '-';
            return `
                <tr class="border-t">
                    <td class="px-3 py-2 align-top">${idx + 1}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(name)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(cat)}</td>
                    <td class="px-3 py-2 align-top">${escapeHtml(addr)}</td>
                    <td class="px-3 py-2 align-top">${lat}</td>
                    <td class="px-3 py-2 align-top">${lng}</td>
                    <td class="px-3 py-2 align-top">
                        <button data-lat="${lat}" data-lng="${lng}" data-name="${escapeAttr(name)}" class="btn-focus-edit text-sm px-3 py-1 rounded-lg bg-slate-100">Pilih</button>
                    </td>
                </tr>
            `;
        }).join('');

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

    function escapeHtml(s) {
        if (!s && s !== 0) return '';
        return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); });
    }

    function escapeAttr(s) { return (s||'').replace(/"/g, '&quot;'); }

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
        // load list when opening
        fetchBoothList();
    }

    // wire tab buttons after DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const tEditor = document.getElementById('tab-editor');
        const tList = document.getElementById('tab-list');
        if (tEditor) tEditor.addEventListener('click', showEditorTab);
        if (tList) tList.addEventListener('click', showListTab);
    });

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
        ['panel-contact','panel-personal','panel-business','panel-booth','panel-testimonial'].forEach(pid => {
            const el = document.getElementById(pid);
            if (!el) return; el.classList.add('hidden');
        });

        const toShow = mapping[idKey] || [];
        toShow.forEach(pid => {
            const el = document.getElementById(pid);
            if (el) el.classList.remove('hidden');
        });

        if (idKey === 'booth') {
            if (window.initBoothEditor) window.initBoothEditor(window.currentProfileDetail || {});
            if (window.refreshBoothMapLayout) window.refreshBoothMapLayout();
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
        const title = document.getElementById('testi-title').value.trim();
        const body = document.getElementById('testi-body').value.trim();
        const rating = parseInt(document.getElementById('testi-rating').value) || 5;
        const photoInput = document.getElementById('testi-photo');

        if (!title || !body) return profileToast('warning', 'Lengkapi judul dan isi testimoni.');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('body', body);
        formData.append('rating', rating);
        if (photoInput && photoInput.files && photoInput.files[0]) formData.append('photo', photoInput.files[0]);

        btnSaveTesti.disabled = true;
        const orig = btnSaveTesti.innerHTML;
        btnSaveTesti.innerHTML = 'Mengirim...';

        try {
            // Try common endpoint
            const resp = await fetch(`${window.baseUrl}/create/testimonial/${customerId}`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${window.apiToken}` }, body: formData
            });

            if (resp.ok) {
                profileToast('success', 'Testimoni berhasil dikirim.');
                document.getElementById('testi-title').value = '';
                document.getElementById('testi-body').value = '';
                document.getElementById('testi-rating').value = '5';
                if (photoInput) photoInput.value = '';
                fetchTestimonialList();
                return;
            }

            // fallback: store in localStorage
            throw new Error('Server tidak merespon');
        } catch (e) {
            // save to localStorage fallback
            try {
                const key = `mki_testimonials_${customerId}`;
                const raw = localStorage.getItem(key);
                const arr = raw ? JSON.parse(raw) : [];
                arr.unshift({ title, body, rating, created_at: new Date().toISOString() });
                localStorage.setItem(key, JSON.stringify(arr));
                profileToast('success', 'Testimoni disimpan secara lokal.');
                fetchTestimonialList();
            } catch (err) {
                console.error('Gagal menyimpan testimoni lokal:', err);
                profileToast('error', 'Gagal mengirim testimoni.');
            }
        } finally {
            btnSaveTesti.disabled = false;
            btnSaveTesti.innerHTML = orig;
        }
    });
});

async function fetchTestimonialList() {
    const tbody = document.querySelector('#testimonial-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">Memuat testimoni...</td></tr>';

    const endpoints = [
        `${window.baseUrl}/list/testimonial/${customerId}`,
        `${window.baseUrl}/testimonials/client/${customerId}`
    ];

    for (const url of endpoints) {
        try {
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${window.apiToken}` } });
            if (!resp.ok) continue;
            const data = await resp.json();
            const items = data && (data.items || data.data || data.testimonials || data) ? (data.items || data.data || data.testimonials || data) : [];
            renderTestimonialTable(Array.isArray(items) ? items : []);
            return;
        } catch (e) {}
    }

    // fallback localStorage
    try {
        const key = `mki_testimonials_${customerId}`;
        const raw = localStorage.getItem(key);
        const items = raw ? JSON.parse(raw) : [];
        renderTestimonialTable(items);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">Tidak ada testimoni.</td></tr>';
    }
}

function renderTestimonialTable(items) {
    const tbody = document.querySelector('#testimonial-table tbody');
    if (!tbody) return;
    if (!items || !items.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">Belum ada testimoni.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((t, idx) => {
        const title = t.title || t.judul || '-';
        const body = t.body || t.isi || '-';
        const rating = t.rating || '-';
        const photo = t.photo_url || t.photo || null;
        const photoCell = photo ? `<a href="${photo}" target="_blank" class="text-red-600">Lihat</a>` : '-';
        return `
            <tr class="border-t">
                <td class="px-3 py-2 align-top">${idx + 1}</td>
                <td class="px-3 py-2 align-top">${escapeHtml(title)}</td>
                <td class="px-3 py-2 align-top">${escapeHtml(body)}</td>
                <td class="px-3 py-2 align-top">${rating}</td>
                <td class="px-3 py-2 align-top">${photoCell}</td>
            </tr>
        `;
    }).join('');
}
