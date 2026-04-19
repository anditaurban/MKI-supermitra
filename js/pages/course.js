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
            const imgId = `cat-thumb-${category.business_category_id}`;

            html += `
            <div class="bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col h-full">
                <!-- Category Thumbnail Header -->
                <div class="aspect-video w-full bg-slate-50 border-b border-neutral-100 overflow-hidden relative group shrink-0">
                    <img id="${imgId}" src="${category.thumbnail || 'https://placehold.co/600x400/f8fafc/cbd5e1?text=No+Image'}" 
                         alt="${category.description}" 
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                         onerror="window.tryLoadAuthImage(this, '${category.thumbnail}')">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="absolute top-3 right-3">
                         <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-red-600 rounded-full shadow-sm border border-red-50 uppercase tracking-wider">${category.business_category}</span>
                    </div>
                </div>

                <div class="p-6 flex-1 flex flex-col">
                    <div class="mb-5 pb-4 border-b border-gray-50">
                        <h3 class="text-lg font-bold text-slate-800 font-poppins line-clamp-2 leading-tight mb-2">${category.description}</h3>
                        <div class="flex items-center gap-2">
                            <div class="flex -space-x-2">
                                <div class="w-6 h-6 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-[10px] text-red-600 font-bold">M</div>
                                <div class="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-600 font-bold">K</div>
                                <div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold text-center">I</div>
                            </div>
                            <p class="text-xs text-slate-500 font-medium ml-1">${category.videos ? category.videos.length : 0} Materi Edukasi</p>
                        </div>
                    </div>
                    
                    <ul class="space-y-2 flex-1">
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
        </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // Dual-load strategy for thumbnails requiring authentication
    window.tryLoadAuthImage = async function (img, url) {
        if (!url || url.includes('placehold.co')) return;
        
        // Prevent infinite loops
        img.onerror = null; 
        
        console.log(`Direct load failed for ${url}, trying authenticated load...`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${window.apiToken}`
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            img.src = objectUrl;
            console.log(`Authenticated load successful for ${url}`);
        } catch (error) {
            console.error('Failure loading authenticated image:', error);
            img.src = 'https://placehold.co/600x400/f8fafc/cbd5e1?text=Unauthorized';
        }
    }

    // Redirect to course player page
    window.playCourseVideo = function (videoId, title) {
        if (videoId) {
            window.location.href = `/course_player.html?id=${videoId}`;
        }
    }
});
