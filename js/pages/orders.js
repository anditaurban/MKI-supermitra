document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (!user) {
        window.location.href = '/';
        return;
    }

    // Load user profile data
    loadUserProfile(user);

    // Profile dropdown logic
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLink = document.querySelector('#profile-dropdown a[href="#"]');
    const courseLink = document.getElementById('course-link');

    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    // Profile & Course link dummy
    if(profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            profileDropdown.classList.add('hidden');
            Swal.fire({
                title: 'Profile',
                text: 'Fitur profile akan segera hadir!',
                icon: 'info',
                confirmButtonColor: '#dc2626'
            });
        });
    }

    if(courseLink) {
        courseLink.addEventListener('click', function(e) {
            e.preventDefault();
            profileDropdown.classList.add('hidden');
            Swal.fire({
                title: 'Course',
                text: 'Fitur course akan segera hadir!',
                icon: 'info',
                confirmButtonColor: '#dc2626'
            });
        });
    }

    document.addEventListener('click', function(e) {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    logoutBtn.addEventListener('click', function() {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: 'Anda akan keluar dari akun ini',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Logout',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('mki_user');
                localStorage.removeItem('mki_cart');
                window.location.href = '/';
            }
        });
    });

    function loadUserProfile(user) {
        const userName = user.name || user.email || 'User';
        document.getElementById('user-name').textContent = userName;
        const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
        document.getElementById('user-role').textContent = userRole;
        const firstLetter = userName.charAt(0).toUpperCase();
        document.getElementById('user-avatar').textContent = firstLetter;
    }

    // Orders Logic
    let currentPage = 1;

    function fetchOrders(page) {
        const customerId = user.customer_id;
        if (!customerId) {
            showEmpty();
            return;
        }

        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('orders-list').classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');

        fetch(`${baseUrl}/table/sales_webstore/${customerId}/${page}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer 3ed66de3108ce387e9d134c419c0fdd61687c3b06760419d32493b18366999d2',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            return response.json();
        })
        .then(data => {
            if (data && data.tableData && data.tableData.length > 0) {
                renderOrders(data.tableData);
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
    }

    function getStatusColor(status) {
        if (!status) return 'bg-gray-100 text-gray-800';
        status = status.toLowerCase();
        if (status.includes('menunggu')) return 'bg-orange-100 text-orange-800 border-[0.5px] border-orange-200';
        if (status.includes('verifikasi')) return 'bg-blue-100 text-blue-800 border-[0.5px] border-blue-200';
        if (status.includes('proses')) return 'bg-indigo-100 text-indigo-800 border-[0.5px] border-indigo-200';
        if (status.includes('selesai')) return 'bg-emerald-100 text-emerald-800 border-[0.5px] border-emerald-200';
        if (status.includes('batal')) return 'bg-red-100 text-red-800 border-[0.5px] border-red-200';
        if (status.includes('sebagian')) return 'bg-yellow-100 text-yellow-800 border-[0.5px] border-yellow-200';
        return 'bg-gray-100 text-gray-800 border-[0.5px] border-gray-200';
    }

    function renderOrders(orders) {
        document.getElementById('loading-state').classList.add('hidden');
        const list = document.getElementById('orders-list');
        list.classList.remove('hidden');
        
        list.innerHTML = orders.map(order => `
            <div class="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-3 mb-2">
                        <span class="font-bold text-slate-800 font-poppins text-lg">${order.no_inv}</span>
                        <span class="px-2.5 py-1 text-xs font-semibold rounded-md ${getStatusColor(order.status)}">${order.status}</span>
                    </div>
                    <div class="space-y-1 text-sm text-slate-500">
                        <p><span class="inline-block w-20">Tanggal</span>: <span class="text-slate-700 font-medium">${order.date}</span></p>
                        <p><span class="inline-block w-20">Tipe</span>: <span class="text-slate-700">${order.sales_type}</span></p>
                        <p><span class="inline-block w-20">Pelanggan</span>: <span class="text-slate-700">${order.customer}</span></p>
                    </div>
                </div>
                <div class="w-full md:w-auto p-4 bg-white md:bg-transparent rounded-xl md:rounded-none border border-neutral-100 md:border-none text-left md:text-right">
                    <p class="text-sm text-slate-500 mb-1">Total Belanja</p>
                    <p class="font-bold text-slate-900 text-xl font-poppins">Rp ${Number(order.total).toLocaleString('id-ID')}</p>
                    ${Number(order.remaining_payment) > 0 
                        ? `<p class="text-sm text-red-600 font-medium mt-2 bg-red-50/50 md:bg-transparent py-1 px-2 md:p-0 rounded-md">Sisa Bayar: Rp ${Number(order.remaining_payment).toLocaleString('id-ID')}</p>` 
                        : ''}
                </div>
            </div>
        `).join('');
    }

    function renderPagination(totalPages, totalRecords, currentPageIndex, period) {
        const pagination = document.getElementById('pagination');
        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }
        
        pagination.classList.remove('hidden');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const info = document.getElementById('page-info');

        info.textContent = `Halaman ${currentPageIndex} dari ${totalPages}`;

        prevBtn.disabled = currentPageIndex <= 1;
        nextBtn.disabled = currentPageIndex >= totalPages;

        prevBtn.onclick = () => {
            if (currentPageIndex > 1) {
                currentPage = currentPageIndex - 1;
                fetchOrders(currentPage);
            }
        };

        nextBtn.onclick = () => {
            if (currentPageIndex < totalPages) {
                currentPage = currentPageIndex + 1;
                fetchOrders(currentPage);
            }
        };
    }

    // Initial fetch
    fetchOrders(currentPage);
});
