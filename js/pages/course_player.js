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

    // URL parameters to get course_video_id
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    if (videoId) {
        loadCourseVideo(videoId);
    } else {
        // If no ID, redirect back to course.html
        window.location.href = '/course.html';
    }

    function loadCourseVideo(videoId) {
        const playlistContainer = document.getElementById('course-playlist-container');
        const progressText = document.getElementById('playlist-progress-text');
        const progressBar = document.getElementById('playlist-progress-bar');
        
        // Fetch videos for this course
        fetch(`${window.baseUrl}/list/course_video/${videoId}`, {
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
                const videoData = data.listData[0];
                const playlist = videoData.videos || [];
                
                // Update Breadcrumb Title
                const breadcrumbTitle = document.getElementById('breadcrumb-title');
                if(breadcrumbTitle) breadcrumbTitle.textContent = videoData.course_video || 'Video Player';

                if(playlist.length > 0) {
                    window.currentPlaylist = playlist;
                    
                    if(progressText) progressText.textContent = `0 / ${playlist.length} Selesai`;
                    if(progressBar) progressBar.style.width = '0%';
                    
                    window.playPlaylistItem(0);
                } else {
                    if(playlistContainer) playlistContainer.innerHTML = '<div class="p-4 bg-orange-50 text-orange-600 rounded-xl text-sm border border-orange-100 italic">Materi belum tersedia di dalam course ini.</div>';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching playlist:', error);
            if(playlistContainer) playlistContainer.innerHTML = '<div class="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">Gagal memuat materi video.</div>';
        });
    }

    window.renderPlaylistItems = function(container, playlist, activeIndex) {
        if(!container) return;
        let html = '';
        
        playlist.forEach((item, index) => {
            const isActive = index === activeIndex;
            const containerClass = isActive ? "bg-red-50 border-red-100 shadow-sm" : "bg-white hover:bg-slate-50 border-transparent border-b-gray-100";
            const titleColor = isActive ? "text-red-600" : "text-slate-700 group-hover:text-red-600";
            const partStr = String(item.part || index + 1).padStart(2, '0');
            
            // Extract YouTube ID for thumbnail
            let ytId = null;
            if (item.url_video) {
                const match = item.url_video.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                if (match) ytId = match[1];
            }
            const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : `https://picsum.photos/seed/${item.part || index}/300/200`;
            
            html += `
            <a href="javascript:void(0)" onclick="window.playPlaylistItem(${index})"
                class="block p-3 rounded-xl border flex gap-4 group transition ${containerClass}">
                <div class="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative bg-gray-200">
                    <img src="${thumbnail}" alt="Thumbnail" class="w-full h-full object-cover">
                    ${isActive ? `
                    <div class="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                        <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                            <svg class="w-4 h-4 text-red-600 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                    </div>` : ''}
                </div>
                <div class="flex-1 py-1">
                    <h4 class="font-semibold text-sm ${titleColor} leading-tight transition-colors line-clamp-2">
                        ${partStr}. ${item.title}
                    </h4>
                    <p class="text-xs ${isActive ? 'text-red-400' : 'text-slate-400'} mt-2 font-medium">${isActive ? 'Sedang diputar • ' : ''}${item.duration || '00:00:00'}</p>
                </div>
            </a>
            `;
        });
        
        container.innerHTML = html;
    }

    window.playPlaylistItem = function(index) {
        const item = window.currentPlaylist ? window.currentPlaylist[index] : null;
        if(!item) return;
        
        const titleEl = document.getElementById('current-video-title');
        const descEl = document.getElementById('current-video-desc');
        const playerIframe = document.getElementById('main-video-player');
        
        const partStr = String(item.part || index + 1).padStart(2, '0');
        
        if(titleEl) titleEl.textContent = `${partStr}. ${item.title}`;
        if(descEl) descEl.textContent = item.description || 'Pelajari materi ini dengan saksama dan ikuti instruksi yang diberikan oleh Master Kuliner Indonesia.';
        
        if(playerIframe && item.url_video) {
            let embedUrl = item.url_video;
            if(embedUrl.includes('youtu.be/')) {
                embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
            } else if(embedUrl.includes('youtube.com/watch?v=')) {
                embedUrl = embedUrl.replace('youtube.com/watch?v=', 'www.youtube.com/embed/');
            }
            playerIframe.src = embedUrl;
        }
        
        const playlistContainer = document.getElementById('course-playlist-container');
        if(playlistContainer && window.currentPlaylist) {
            window.renderPlaylistItems(playlistContainer, window.currentPlaylist, index);
        }
    }
});
