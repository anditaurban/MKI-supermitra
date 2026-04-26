// Menonaktifkan Klik Kanan
document.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

// Menonaktifkan Kombinasi Tombol Developer Tools
document.addEventListener("keydown", function(event) {
    // Deteksi F12
    if (event.key === "F12" || event.keyCode === 123) {
        event.preventDefault();
    }

    // Deteksi Ctrl+Shift+I / Ctrl+Shift+J
    if (event.ctrlKey && event.shiftKey && (event.key === "I" || event.key === "J" || event.code === "KeyI" || event.code === "KeyJ")) {
        event.preventDefault();
    }

    // Deteksi Ctrl+U
    if (event.ctrlKey && (event.key === "u" || event.key === "U" || event.code === "KeyU" || event.keyCode === 85)) {
        event.preventDefault();
    }
});