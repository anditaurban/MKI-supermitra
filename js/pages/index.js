// Fetch public Brands asynchronously to populate the Grid
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('brandsGrid');
    try {
        // Fetch to our established public route
        const response = await fetch('/api/v1/brands/public');
        const data = await response.json();

        if (data.success && data.brands.length > 0) {
            grid.innerHTML = data.brands.map(brand => `
                        <a href="#" class="shrink-0 w-32 sm:w-40 md:w-48 lg:w-56 rounded-2xl bg-white border border-neutral-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg group">
                            <div class="aspect-square rounded-t-2xl bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=dc2626&color=fff&size=512" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" alt="${brand.name}">
                            </div>
                            <div class="px-4 py-3 text-center border-t border-neutral-100">
                                <p class="text-sm sm:text-base font-poppins font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate">${brand.name}</p>
                                <p class="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">${brand.description || 'Kemitraan Spesial'}</p>
                            </div>
                        </a>
                    `).join('');
        } else {
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Katalog Brand sedang dalam perawatan.</div>';
        }
    } catch (err) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Gagal memuat katalog brand.</div>';
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (user) {
        window.location.href = '/store.html';
    }

    function openLoginModal() {
        console.log('Opening login modal');

        // Step 1: Input WhatsApp
        Swal.fire({
            title: 'Masuk ke Akun Anda',
            html: `
                <p class="text-sm text-gray-600 mb-4">Masukkan nomor WhatsApp untuk menerima OTP</p>
                <input id="swal-whatsapp" type="tel" class="swal2-input" placeholder="contoh: 08123456789" maxlength="13">
            `,
            showCancelButton: true,
            confirmButtonText: 'Kirim OTP',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const whatsapp = document.getElementById('swal-whatsapp').value.trim();
                if (!whatsapp) {
                    Swal.showValidationMessage('Mohon isi nomor WhatsApp terlebih dahulu.');
                    return false;
                }
                if (!/^08[1-9][0-9]{7,10}$/.test(whatsapp)) {
                    Swal.showValidationMessage('Format nomor WhatsApp tidak valid. Harus diawali dengan 08.');
                    return false;
                }
                return whatsapp;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const waNumber = result.value;
                sendOTP(waNumber);
            }
        });
    }

    function sendOTP(waNumber) {
        // Show loading
        Swal.fire({
            title: 'Mengirim OTP...',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // Simulate API call (replace with actual API)
        fetch(`${baseUrl}/client_login/${ownerId}/${waNumber}`)
            .then(response => response.json())
            .then(data => {
                // Step 2: Input OTP
                Swal.fire({
                    title: 'Masukkan Kode OTP',
                    html: `
                        <p class="text-sm text-gray-600 mb-4">Kode OTP telah dikirim ke ${waNumber}</p>
                        <div class="flex justify-center space-x-2 mb-4">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            <input type="text" maxlength="1" class="otp-input-swal w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>
                        <button id="resend-otp" class="text-sm text-red-600 hover:text-red-500">Kirim ulang OTP</button>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Verifikasi OTP',
                    confirmButtonColor: '#dc2626',
                    cancelButtonText: 'Kembali',
                    didOpen: () => {
                        const otpInputs = document.querySelectorAll('.otp-input-swal');
                        otpInputs.forEach((input, index) => {
                            input.addEventListener('input', (e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                e.target.value = value;
                                if (value && index < otpInputs.length - 1) {
                                    otpInputs[index + 1].focus();
                                }
                            });
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                                    otpInputs[index - 1].focus();
                                }
                            });
                            input.addEventListener('paste', (e) => {
                                e.preventDefault();
                                const paste = (e.clipboardData || window.clipboardData).getData('text');
                                const digits = paste.replace(/\D/g, '').slice(0, 6);
                                digits.split('').forEach((digit, i) => {
                                    if (otpInputs[i]) otpInputs[i].value = digit;
                                });
                                if (digits.length === 6) {
                                    otpInputs[5].focus();
                                }
                            });
                        });
                        otpInputs[0].focus();

                        // Resend OTP
                        document.getElementById('resend-otp').addEventListener('click', () => {
                            sendOTP(waNumber);
                        });
                    },
                    preConfirm: () => {
                        const otpInputs = document.querySelectorAll('.otp-input-swal');
                        const otp = Array.from(otpInputs).map(input => input.value).join('');
                        if (otp.length !== 6) {
                            Swal.showValidationMessage('Mohon isi kode OTP 6 digit terlebih dahulu.');
                            return false;
                        }
                        return otp;
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const otp = result.value;
                        verifyOTP(otp);
                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                        openLoginModal(); // Back to WA input
                    }
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Gagal mengirim OTP. Silakan coba lagi.',
                    confirmButtonColor: '#dc2626'
                });
            });
    }

    function verifyOTP(otp) {
        // Show loading
        Swal.fire({
            title: 'Memverifikasi...',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // Simulate API call (replace with actual API)
        fetch(`${baseUrl}/otp/client_login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp })
        })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Verifikasi OTP Sesuai') {
                    // Store user data (simplified)
                    localStorage.setItem('mki_user', JSON.stringify(data));
                    // Direct redirect to store without Swal
                    window.location.href = '/store.html';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'OTP Tidak Valid',
                        text: 'Silakan coba lagi.',
                        confirmButtonColor: '#dc2626'
                    });
                }
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Gagal verifikasi OTP. Silakan coba lagi.',
                    confirmButtonColor: '#dc2626'
                });
            });
    }

    // Make functions global
    window.openLoginModal = openLoginModal;
});
