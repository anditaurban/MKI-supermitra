document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('mki_user'));
    if (!user) {
        window.location.href = '/';
    }

    // Load user profile data
    loadUserProfile(user);

    let cart = JSON.parse(localStorage.getItem('mki_cart')) || [];
    let products = [];

    // Load products
    loadProducts();

    // Search functionality
    document.getElementById('search-input').addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
        renderProducts(filteredProducts);
    });

    // Cart modal
    document.getElementById('cart-btn').addEventListener('click', function () {
        document.getElementById('cart-modal').classList.remove('hidden');
        renderCart();
    });

    document.getElementById('cart-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });

    // Close cart modal button
    document.getElementById('close-cart-modal').addEventListener('click', function () {
        document.getElementById('cart-modal').classList.add('hidden');
    });

    // Clear all cart button
    document.getElementById('clear-cart-btn').addEventListener('click', function () {
        clearAllCart();
    });

    // Checkout button
    document.getElementById('checkout-btn').addEventListener('click', function () {
        if (cart.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Keranjang Kosong!',
                text: 'Tambahkan produk ke keranjang terlebih dahulu.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#DC2626',
                color: '#ffffff'
            });
            return;
        }
        // Notifikasi sebelum checkout
        Swal.fire({
            icon: 'info',
            title: 'Pemberitahuan',
            text: 'Harga yang tertera belum termasuk ongkos kirim. Tim Sales kami akan menghubungi Anda untuk konfirmasi biaya pengiriman dan proses pembayaran selanjutnya.',
            confirmButtonText: 'Lanjutkan Checkout',
            customClass: {
                confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                checkoutCart();
            }
        });
    });

    // Profile dropdown
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLink = document.querySelector('#profile-dropdown a[href="#"]');
    const courseLink = document.getElementById('course-link');

    profileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    // Profile link (placeholder for now)
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

    // Course link
    courseLink.addEventListener('click', function (e) {
        e.preventDefault();
        profileDropdown.classList.add('hidden');
        Swal.fire({
            title: 'Course',
            text: 'Fitur course akan segera hadir!',
            icon: 'info',
            confirmButtonColor: '#dc2626'
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    // Logout functionality
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

    function loadProducts() {
        document.getElementById('loading').style.display = 'block';

        // Get user data for customer_id
        const user = JSON.parse(localStorage.getItem('mki_user'));
        if (!user) {
            console.error('User data not found');
            document.getElementById('loading').style.display = 'none';
            return;
        }

        // Use owner_id as customer_id if customer_id not available
        const customerId = user.customer_id || user.owner_id;
        if (!customerId) {
            console.error('Customer ID not found in user data');
            document.getElementById('loading').style.display = 'none';
            return;
        }
        // Fetch products from API
        fetch(`${baseUrl}/list/product_sales_msi/${customerId}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer 3ed66de3108ce387e9d134c419c0fdd61687c3b06760419d32493b18366999d2',
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Map API response to our product format
                products = data.listData.map(item => ({
                    id: item.product_id,
                    name: item.product,
                    description: item.description || `${item.category} - ${item.unit}`,
                    price: item.sale_price,
                    image: '/assets/images/brands/CCC.webp', // Default image since API doesn't provide images
                    stock: item.stock,
                    category: item.category
                }));

                document.getElementById('loading').style.display = 'none';
                renderProducts(products);
            })
            .catch(error => {
                console.error('Error loading products:', error);
                document.getElementById('loading').style.display = 'none';
                // Show error state
                document.getElementById('empty-state').classList.remove('hidden');
                document.getElementById('empty-state').innerHTML = `
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Gagal memuat produk</h3>
                <p class="mt-1 text-sm text-gray-500">Silakan coba lagi nanti.</p>
            `;
            });
    }

    function renderProducts(productsToRender) {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = '';

        if (productsToRender.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');

        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-neutral-100 overflow-hidden group';
            productCard.innerHTML = `
                <div class="aspect-square overflow-hidden bg-neutral-100">
                    <img alt="${product.name}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" src="${product.image}">
                </div>
                <div class="p-4">
                    <h3 class="font-poppins text-lg font-bold text-slate-900 mb-2">${product.name}</h3>
                    <p class="text-sm text-slate-500 leading-relaxed mb-4">${product.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-red-600">Rp ${product.price.toLocaleString()}</span>
                        <button onclick="addToCart(${product.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
                            Tambah
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(productCard);
        });
    }

    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem('mki_cart', JSON.stringify(cart));
        updateCartCount();

        // Toast notification
        Swal.fire({
            icon: 'success',
            title: 'Ditambahkan ke keranjang!',
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#DC2626',
            color: '#ffffff'
        });
    }

    function renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        const clearCartBtn = document.getElementById('clear-cart-btn');

        // Show/hide clear cart button based on cart items
        if (cart.length > 0) {
            clearCartBtn.classList.remove('hidden');
        } else {
            clearCartBtn.classList.add('hidden');
        }

        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="text-gray-500 text-center">Keranjang kosong</p>';
            cartTotal.textContent = 'Rp 0';
            return;
        }

        let total = 0;
        cartItems.innerHTML = cart.map(item => {
            total += item.price * item.quantity;
            return `
                <div class="flex items-center gap-4 mb-4 pb-4 border-b border-neutral-100">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm">${item.name}</h4>
                        <p class="text-xs text-gray-500">Rp ${item.price.toLocaleString()}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})" class="w-6 h-6 ${item.quantity <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'} rounded-full flex items-center justify-center text-xs font-bold transition-colors" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span class="text-sm font-medium min-w-[20px] text-center">${item.quantity}</span>
                            <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})" class="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold transition-colors">+</button>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm">Rp ${(item.price * item.quantity).toLocaleString()}</p>
                        <button onclick="removeFromCart(${item.id})" class="text-red-500 text-xs hover:text-red-700">Hapus</button>
                    </div>
                </div>
            `;
        }).join('');

        cartTotal.textContent = `Rp ${total.toLocaleString()}`;
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('mki_cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }

    function updateCartQuantity(productId, newQuantity) {
        if (newQuantity < 1) return; // Minimum quantity is 1

        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex !== -1) {
            cart[itemIndex].quantity = newQuantity;
            localStorage.setItem('mki_cart', JSON.stringify(cart));
            updateCartCount();
            renderCart();
        }
    }

    function clearAllCart() {
        Swal.fire({
            title: 'Hapus Semua Item?',
            text: 'Apakah Anda yakin ingin menghapus semua item dari keranjang?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                cart = [];
                localStorage.setItem('mki_cart', JSON.stringify(cart));
                updateCartCount();
                renderCart();

                // Toast notification
                Swal.fire({
                    icon: 'success',
                    title: 'Keranjang Dikosongkan!',
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    background: '#DC2626',
                    color: '#ffffff'
                });
            }
        });
    }

    async function checkoutCart() {
        try {
            // Get user data
            const user = JSON.parse(localStorage.getItem('mki_user'));
            if (!user) {
                throw new Error('User data not found');
            }

            const customerId = user.customer_id || user.owner_id;
            if (!customerId) {
                throw new Error('Customer ID not found');
            }
            console.log('Using customer_id:', customerId);

            // Calculate totals
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discountNominal = 0; // No discount for now
            const taxPercent = 11; // 11% tax
            const tax = Math.round(subtotal * taxPercent / 100);
            const shipping = 0; // Fixed shipping cost
            const total = subtotal - discountNominal + tax + shipping;

            // Build sales_detail from cart
            const salesDetail = cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                sale_price: item.price,
                discount_price: 0
            }));

            // Build payload
            const payload = {
                owner_id: 4464,
                user_id: 4464,
                type_id: 5,
                salesman_id: 0,
                date: new Date().toISOString(), // Current date in ISO format
                customer_id: customerId,
                contact_id: 0,
                discount_nominal: discountNominal,
                tax_percent: taxPercent,
                tax: tax,
                courier_id: 0,
                courier_note: "",
                shipping: shipping,
                mp_admin: 0,
                catatan: "",
                syaratketentuan: "",
                termpayment: "",
                sales_detail: salesDetail
            };

            // Show loading on button
            const checkoutBtn = document.getElementById('checkout-btn');
            const originalText = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = `
                <div class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                </div>
            `;
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-75', 'cursor-not-allowed');

            // Send API request
            console.log('Sending checkout payload:', payload);
            const response = await fetch(`${baseUrl}/add/sales_msi`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer 3ed66de3108ce387e9d134c419c0fdd61687c3b06760419d32493b18366999d2',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('API Response status:', response.status);
            console.log('API Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('API Success response:', result);

            // Reset button
            checkoutBtn.innerHTML = originalText;
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-75', 'cursor-not-allowed');

            // Clear cart
            cart = [];
            localStorage.setItem('mki_cart', JSON.stringify(cart));
            updateCartCount();
            renderCart();

            // Close cart modal
            document.getElementById('cart-modal').classList.add('hidden');

            // Show success toast
            Swal.fire({
                icon: 'success',
                title: 'Checkout Berhasil!',
                text: 'Pesanan Anda telah berhasil diproses.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#DC2626',
                color: '#ffffff'
            });

        } catch (error) {
            console.error('Checkout error:', error);

            // Reset button on error
            const checkoutBtn = document.getElementById('checkout-btn');
            checkoutBtn.innerHTML = 'Checkout';
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-75', 'cursor-not-allowed');

            // Show error toast
            Swal.fire({
                icon: 'error',
                title: 'Checkout Gagal!',
                text: 'Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                background: '#DC2626',
                color: '#ffffff'
            });
        }
    }

    function updateCartCount() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

    function loadUserProfile(user) {
        // Set user name
        const userName = user.name || user.email || 'User';
        document.getElementById('user-name').textContent = userName;

        // Set user role
        const userRole = user.role === 'admin' ? 'Admin' : 'Partner';
        document.getElementById('user-role').textContent = userRole;

        // Set user avatar (first letter of name)
        const firstLetter = userName.charAt(0).toUpperCase();
        document.getElementById('user-avatar').textContent = firstLetter;
    }

    // Initialize cart count
    updateCartCount();

    // Make functions global
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateCartQuantity = updateCartQuantity;
    window.clearAllCart = clearAllCart;
    window.checkoutCart = checkoutCart;
});
