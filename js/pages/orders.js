document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (!user) {
        window.location.href = '/';
        return;
    }


    // Handle profile display once component is loaded
    document.addEventListener('profileNavLoaded', () => {
        const profileSection = document.getElementById('profile-section');
        if (user && profileSection) {
            profileSection.classList.remove('hidden');
            loadUserProfile(user);
        }
    });

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

    // Orders Logic
    let currentPage = 1;
    let currentSearch = '';
    let currentStartDate = '';
    let currentEndDate = '';
    let currentStatus = '';

    function fetchOrders(page, q = '', startDate = '', endDate = '', status = '') {
        const customerId = user.customer_id;
        if (!customerId) {
            showEmpty();
            return;
        }
        // normalize and store current filters
        currentSearch = (q || '').trim();
        currentStartDate = startDate || '';
        currentEndDate = endDate || '';
        currentStatus = status || '';

        document.getElementById('loading-state').classList.remove('hidden');
        const list = document.getElementById('orders-list');
        if (list) list.classList.add('hidden');
        const container = document.getElementById('orders-table-container');
        if (container) container.classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');

        // build query params (include common alternates for backend compatibility)
        const params = [];
        if (currentSearch) params.push(`search=${encodeURIComponent(currentSearch)}`);
        if (currentStartDate) {
            params.push(`start_date=${encodeURIComponent(currentStartDate)}`);
            params.push(`startDate=${encodeURIComponent(currentStartDate)}`);
        }
        if (currentEndDate) {
            params.push(`end_date=${encodeURIComponent(currentEndDate)}`);
            params.push(`endDate=${encodeURIComponent(currentEndDate)}`);
        }
        if (currentStatus) {
            params.push(`status=${encodeURIComponent(currentStatus)}`);
            params.push(`status_key=${encodeURIComponent(currentStatus)}`);
        }
        const qs = params.length ? `?${params.join('&')}` : '';

        const url = `${baseUrl}/table/sales_webstore/${customerId}/${page}${qs}`;
        console.debug('[ORDERS] Fetch URL:', url);
        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                return response.json();
            })
            .then(data => {
                if (data && data.summaryData) {
                    renderSummary(data.summaryData);
                }
                if (data && data.tableData && data.tableData.length > 0) {
                    renderOrdersTable(data.tableData);
                    renderPagination(data.totalPages, data.totalRecords, page, data.period);
                } else {
                    showEmpty();
                }
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
                showEmpty();
            });
    }

    function showEmpty() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
        const container = document.getElementById('orders-table-container');
        if (container) container.classList.add('hidden');
    }

    function getStatusColor(status) {
        if (!status) return 'bg-gray-100 text-gray-800';
        status = status.toLowerCase();
        if (status.includes('konfirmasi')) return 'bg-teal-100 text-teal-800 border-[0.5px] border-teal-200';
        if (status.includes('menunggu')) return 'bg-orange-100 text-orange-800 border-[0.5px] border-orange-200';
        if (status.includes('verifikasi')) return 'bg-blue-100 text-blue-800 border-[0.5px] border-blue-200';
        if (status.includes('proses')) return 'bg-indigo-100 text-indigo-800 border-[0.5px] border-indigo-200';
        if (status.includes('selesai')) return 'bg-emerald-100 text-emerald-800 border-[0.5px] border-emerald-200';
        if (status.includes('batal')) return 'bg-red-100 text-red-800 border-[0.5px] border-red-200';
        if (status.includes('sebagian')) return 'bg-yellow-100 text-yellow-800 border-[0.5px] border-yellow-200';
        return 'bg-gray-100 text-gray-800 border-[0.5px] border-gray-200';
    }

    function renderSummary(summary) {
        const container = document.getElementById('summary-cards');
        if (!container || !summary) return;

        const formatNum = (val) => val === null || val === undefined ? '0' : val;

        container.innerHTML = `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-teal-500 mb-1">${formatNum(summary.menunggu_konfirmasi)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Menunggu Konfirmasi</p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-orange-500 mb-1">${formatNum(summary.menunggu_pembayaran)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Menunggu Pembayaran</p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-blue-500 mb-1">${formatNum(summary.sedang_diverifikasi)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Sedang Diverifikasi</p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-yellow-500 mb-1">${formatNum(summary.bayar_sebagian)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Bayar Sebagian</p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-indigo-500 mb-1">${formatNum(summary.sedang_diproses)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Sedang Diproses</p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow">
                <p class="text-3xl font-poppins font-bold text-slate-500 mb-1">${formatNum(summary.paket_terkirim)}</p>
                <p class="text-xs text-slate-500 font-medium whitespace-nowrap truncate">Paket Terkirim</p>
            </div>
        `;
    }

    function renderOrdersTable(orders) {
        document.getElementById('loading-state').classList.add('hidden');
        const container = document.getElementById('orders-table-container');
        const tbody = document.getElementById('orders-table-body');

        container.classList.remove('hidden');

        tbody.innerHTML = orders.map(order => `
            <tr class="block md:table-row hover:bg-slate-50/80 transition-colors bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-neutral-100 md:border-0 md:border-b md:border-neutral-100 p-2 md:p-0 mb-4 md:mb-0">
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 font-bold text-slate-800 font-poppins text-sm md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">No. Invoice</span>
                    <a href="#" class="hover:text-red-600 transition-colors">${order.no_inv}</a>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 md:text-center md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Status</span>
                    <span class="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-md ${getStatusColor(order.status)}">
                        ${order.status}
                    </span>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 text-sm text-slate-600 md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Tanggal</span>
                    <span>${order.date}</span>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 text-sm text-slate-700 font-semibold md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Pelanggan</span>
                    <span>${order.customer}</span>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 text-sm text-slate-600 md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Tipe</span>
                    <span>${order.sales_type}</span>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 text-sm font-bold text-slate-900 md:text-right font-poppins md:whitespace-nowrap border-b border-neutral-50 md:border-none">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Total</span>
                    <span>Rp ${Number(order.total).toLocaleString('id-ID')}</span>
                </td>
                <td class="flex justify-between items-center md:table-cell p-3 md:p-4 text-sm md:text-right md:whitespace-nowrap ${Number(order.remaining_payment) > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}">
                    <span class="md:hidden text-xs font-semibold text-slate-500">Sisa Bayar</span>
                    <span>Rp ${Number(order.remaining_payment).toLocaleString('id-ID')}</span>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(totalPages, totalRecords, currentPageIndex, period) {
        const pagination = document.getElementById('pagination');

        // Selalu tampilkan pagination meskipun total halaman <= 1
        pagination.classList.remove('hidden');

        const safeTotalPages = totalPages > 0 ? totalPages : 1;
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const info = document.getElementById('page-info');

        info.textContent = `Halaman ${currentPageIndex} dari ${safeTotalPages}`;

        prevBtn.disabled = currentPageIndex <= 1;
        nextBtn.disabled = currentPageIndex >= totalPages;

        prevBtn.onclick = () => {
            if (currentPageIndex > 1) {
                currentPage = currentPageIndex - 1;
                fetchOrders(currentPage, currentSearch, currentStartDate, currentEndDate, currentStatus);
            }
        };

        nextBtn.onclick = () => {
            if (currentPageIndex < totalPages) {
                currentPage = currentPageIndex + 1;
                fetchOrders(currentPage, currentSearch, currentStartDate, currentEndDate, currentStatus);
            }
        };
    }

    // Initial fetch
    // wire search input (debounced) and filters
    const ordersSearchInput = document.getElementById('orders-search');
    const ordersStartInput = document.getElementById('orders-start-date');
    const ordersEndInput = document.getElementById('orders-end-date');
    const ordersStatusSelect = document.getElementById('orders-status');
    const ordersApplyBtn = document.getElementById('orders-apply-filters');

    let ordersSearchTimer = null;
    const applyFilters = () => {
        currentPage = 1;
        const q = ordersSearchInput ? ordersSearchInput.value.trim() : '';
        const s = ordersStartInput ? ordersStartInput.value : '';
        const e = ordersEndInput ? ordersEndInput.value : '';
        const st = ordersStatusSelect ? ordersStatusSelect.value : '';
        fetchOrders(1, q, s, e, st);
    };

    if (ordersSearchInput) {
        ordersSearchInput.addEventListener('input', () => {
            const q = ordersSearchInput.value || '';
            if (ordersSearchTimer) clearTimeout(ordersSearchTimer);
            ordersSearchTimer = setTimeout(() => {
                applyFilters();
            }, 350);
        });
    }

    if (ordersApplyBtn) {
        ordersApplyBtn.addEventListener('click', () => {
            applyFilters();
        });
    }

    // Fetch available order statuses from server and populate select
    async function fetchOrderStatusList() {
        if (!ordersStatusSelect) return;
        // derive ownerId from session
        const ownerId = (user && (user.owner_id || user.ownerId || user.ownerid)) || user.customer_id || '';
        if (!ownerId) return;
        try {
            const resp = await fetch(`${baseUrl}/list/sales_status/${ownerId}`, {
                headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const list = Array.isArray(data.listData) ? data.listData : [];
            // clear and populate
            ordersStatusSelect.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = '';
            optAll.textContent = 'Semua Status';
            ordersStatusSelect.appendChild(optAll);
            list.forEach(item => {
                const o = document.createElement('option');
                o.value = String(item.status_id);
                o.textContent = item.status || `Status ${item.status_id}`;
                ordersStatusSelect.appendChild(o);
            });
        } catch (err) {
            console.error('Gagal memuat daftar status:', err);
        }
    }

    // load statuses then initial fetch
    fetchOrderStatusList().finally(() => {
        fetchOrders(currentPage, currentSearch, currentStartDate, currentEndDate, currentStatus);
    });
});
