// Gantikan dengan URL Web App Google yang anda salin di langkah sebelum ini
const API_URL = "hhttps://script.google.com/macros/s/AKfycbyDALjtVBkLFQwtBXTgZjHJ1zgKkhqNfIhg8ylv5FWNEepB0Dkr3D2uOwWBde-N8n_wrg/exec";
async function hantarDataTransaksi(nama, item) {
    // Tunjukkan animasi loading menggunakan SweetAlert2
    Swal.fire({
        title: 'Memproses...',
        text: 'Sila tunggu sebentar sementara sistem menyemak rekod.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });
    try {
        // PENTING: Jangan letak header Content-Type: application/json untuk mengelakkan 
ralat CORS OPTIONS
        const respon = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({ nama: nama, item: item })
        });
        const hasil = await respon.json();
        if (hasil.status === "success") {
            Swal.fire({
                icon: 'success',
                title: 'Berjaya!',
                text: hasil.message,
                confirmButtonColor: '#3b82f6'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Had Maksimum Tercapai',
                text: hasil.message,
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Ralat Sambungan',
            text: 'Gagal menghubungi pelayan. Sila cuba lagi.',
            confirmButtonColor: '#ef4444'
        });
        console.error("Error:", error);
    }
}