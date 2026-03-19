// centralized UI feedback system

const ui = {
    _overlay: null,

    _createLoadingOverlay() {
        if (this._overlay) return;

        this._overlay = document.createElement('div');
        this._overlay.className = 'fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity opacity-0 pointer-events-none';
        this._overlay.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                <svg class="animate-spin h-10 w-10 text-primary-green-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p id="uiLoadingText" class="text-slate-700 font-bold tracking-wide">Memproses Transaksi...</p>
            </div>
        `;
        document.body.appendChild(this._overlay);

        // Force reflow
        void this._overlay.offsetWidth;
    },

    showLoading(text = "Sedang Memproses...") {
        this._createLoadingOverlay();
        document.getElementById('uiLoadingText').textContent = text;
        this._overlay.classList.remove('opacity-0', 'pointer-events-none');
        this._overlay.classList.add('opacity-100');
    },

    hideLoading() {
        if (this._overlay) {
            this._overlay.classList.remove('opacity-100');
            this._overlay.classList.add('opacity-0', 'pointer-events-none');
        }
    },

    showAlert(message, isError = false) {
        // A generic toast or alert, for simplicity wrapping existing window.alert natively,
        // or constructing a quick toast model in future iterations. 
        // For Phase 10 bounds, we will pipe native alerts to minimize DOM pollution across all pages.
        alert(isError ? `PERINGATAN SISKAL:\n\n${message}` : `INFORMASI:\n\n${message}`);
    }
};

export default ui;
