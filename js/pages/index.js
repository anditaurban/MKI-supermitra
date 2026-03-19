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
