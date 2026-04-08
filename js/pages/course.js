document.addEventListener('DOMContentLoaded', function () {
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

    if (profileBtn) {
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
    }

    if (profileLink) {
        profileLink.addEventListener('click', function (e) {
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

    document.addEventListener('click', function (e) {
        if (profileBtn && profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
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

    // Load available courses from API
    const clientId = user.customer_id || user.owner_id || user.client_id;
    if (clientId) {
        fetchCourseData(clientId);
    }

    function fetchCourseData(clientId) {
        const container = document.getElementById('course-categories-container');
        if (!container) return;

        // Tampilkan loading skeleton
        container.innerHTML = `
            <div class="flex items-center justify-center p-12 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                <div class="flex flex-col items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-slate-500 font-medium animate-pulse">Memuat materi pelatihan...</p>
                </div>
            </div>
        `;

        fetch(`${window.baseUrl}/list/course/${clientId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${window.apiToken}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) throw new Error('API Error');
                return response.json();
            })
            .then(data => {
                if (data && data.listData && data.listData.length > 0) {
                    renderCourseCategories(data.listData, container);
                } else {
                    container.innerHTML = `
                    <div class="bg-orange-50 text-orange-800 p-6 rounded-2xl border border-orange-100 flex items-center justify-center gap-4 shadow-sm">
                        <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="text-sm font-medium">Belum ada materi pelatihan yang ditugaskan untuk Anda pada saat ini.</div>
                    </div>
                `;
                }
            })
            .catch(error => {
                console.error('Failure pulling course data:', error);
                container.innerHTML = `
                <div class="bg-red-50 text-red-800 p-6 rounded-2xl border border-red-100 flex items-center justify-center gap-4 shadow-sm">
                    <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div class="text-sm font-medium">Gagal memuat daftar materi pelatihan. Silakan <button onclick="location.reload()" class="underline hover:text-red-900 font-bold">muat ulang halaman</button>.</div>
                </div>
            `;
            });
    }

    function renderCourseCategories(categories, container) {
        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';

        categories.forEach(category => {
            html += `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div class="flex items-center gap-4 mb-5 pb-4 border-b border-gray-50">
                    <div class="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0 shadow-inner">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-800 font-poppins">${category.description} (${category.business_category})</h3>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">${category.videos ? category.videos.length : 0} Materi Edukasi</p>
                    </div>
                </div>
                <ul class="space-y-2">
            `;

            if (category.videos && category.videos.length > 0) {
                category.videos.forEach(video => {
                    const cleanTitle = video.course_video.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    html += `
                    <li class="group">
                        <button class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all text-left" onclick="playCourseVideo(${video.course_video_id}, '${cleanTitle}')">
                            <div class="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center shrink-0 border border-slate-100 transition-colors">
                                <svg class="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <span class="text-sm font-semibold text-slate-700 group-hover:text-red-700 transition-colors block leading-snug truncate">${video.course_video}</span>
                            </div>
                        </button>
                    </li>
                    `;
                });
            } else {
                html += `
                    <li class="p-3 text-center rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                        <span class="text-xs text-slate-400 italic">Materi belum diunggah</span>
                    </li>
                `;
            }

            html += `
                </ul>
            </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // Redirect to course player page
    window.playCourseVideo = function (videoId, title) {
        if(videoId) {
            window.location.href = `/course_player.html?id=${videoId}`;
        }
    }
});
