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

    if(profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
    }

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

    document.addEventListener('click', function(e) {
        if (profileBtn && profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    if(logoutBtn) {
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
    }

    function loadUserProfile(user) {
        const userName = user.name || user.email || 'User';
        const nameEl = document.getElementById('user-name');
        if(nameEl) nameEl.textContent = userName;
        
        const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
        const roleEl = document.getElementById('user-role');
        if(roleEl) roleEl.textContent = userRole;
        
        const firstLetter = userName.charAt(0).toUpperCase();
        const avatarEl = document.getElementById('user-avatar');
        if(avatarEl) avatarEl.textContent = firstLetter;
    }
});
