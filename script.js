const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWO1WcTeYxX7QQMmZjugETaEmGJOSG_TMWCrJohiG91PfrWJSpY5JKro59-USxq-StUOQw5EgyopO/pub?output=csv';
let databaseRecords = [];

// Senarai Barang Utama yang dikira dalam had 2 barangan harian (Roti Ditambah)
const standardItems = ["Air Kotak", "Biskut Lexus", "Biskut Oat Krunch", "Kismis", "Kurma", "Roti"];

// Senarai Keseluruhan yang akan dipaparkan di skrin Troli
const itemList = [...standardItems, "Makanan Infaq"];

let cart = {};
const MAX_QTY = 2;

let slideIndex = 0;
let slideTimeout;

function showSlides() {
    let slides = document.getElementsByClassName("carousel-slide");
    let dots = document.getElementsByClassName("dot");
    if(slides.length === 0) return;
    
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > slides.length) {slideIndex = 1}
    for (let i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active-dot", "");
    }
    slides[slideIndex-1].style.display = "block";
    dots[slideIndex-1].className += " active-dot";
    
    slideTimeout = setTimeout(showSlides, 4000); 
}

function currentSlide(n) {
    clearTimeout(slideTimeout);
    slideIndex = n - 1;
    showSlides();
}

function initCart() {
    const container = document.getElementById('cart-container');
    itemList.forEach(item => {
        cart[item] = 0;
        const itemId = item.replace(/ /g, '_');
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span class="item-name">${item}</span>
            <div class="cart-controls">
                <button type="button" class="cart-btn" onclick="updateQty('${item}', -1)">-</button>
                <span class="item-qty" id="qty_${itemId}">0</span>
                <button type="button" class="cart-btn" onclick="updateQty('${item}', 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateQty(itemName, change) {
    // Hanya kira jumlah barangan utama untuk kuota maks 2 (Makanan Infaq dikecualikan)
    let currentTotal = standardItems.reduce((total, item) => total + (cart[item] || 0), 0);

    // Had maks 1 bagi setiap jenis barang (termasuk Infaq)
    if (change > 0 && cart[itemName] >= 1) {
        Swal.fire({
            icon: 'warning',
            title: 'Perhatian',
            text: `Anda hanya dibenarkan mengambil MAKSIMUM 1 unit sahaja untuk item [${itemName}].`,
            confirmButtonColor: '#2c3e50'
        });
        return;
    }

    // Had maks 2 secara keseluruhan HANYA untuk barang utama
    if (change > 0 && itemName !== "Makanan Infaq" && currentTotal >= MAX_QTY) {
        Swal.fire({
            icon: 'info',
            title: 'Had Maksimum',
            text: 'Maksimum 2 barang utama sahaja dibenarkan!',
            confirmButtonColor: '#2c3e50'
        });
        return;
    }

    if (cart[itemName] + change < 0) return;

    // Lakukan pertambahan/pengurangan
    cart[itemName] += change;
    document.getElementById(`qty_${itemName.replace(/ /g, '_')}`).innerText = cart[itemName];
    
    // Kira semula total selepas perubahan
    currentTotal = standardItems.reduce((total, item) => total + (cart[item] || 0), 0);
    document.getElementById('total-count-display').innerText = `${currentTotal}/${MAX_QTY} Diambil`;
    
    // Asingkan data submission mengikut soalan Google Form
    let selectedItems = [];
    standardItems.forEach(item => {
        if (cart[item] > 0) selectedItems.push(`${item} (${cart[item]})`);
    });
    document.getElementById('final_items').value = selectedItems.join(', ');

    let infaqInput = document.getElementById('infaq_hidden_input');
    if (infaqInput) {
        infaqInput.value = cart["Makanan Infaq"] > 0 ? "Ambil Makanan Infaq" : "";
    }
}

function parseCSVRow(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
}

function isToday(csvDateStr) {
    if (!csvDateStr) return false;
    let datePart = csvDateStr.split(' ')[0]; 
    let today = new Date();
    let d = String(today.getDate()).padStart(2, '0');
    let m = String(today.getMonth() + 1).padStart(2, '0');
    let y = today.getFullYear();
    let f1 = `${d}/${m}/${y}`;
    let f2 = `${y}-${m}-${d}`;
    let f3 = `${parseInt(d)}/${parseInt(m)}/${y}`;
    return datePart.includes(f1) || datePart.includes(f2) || datePart.trim() === f3;
}

async function fetchDatabase() {
    try {
        const res = await fetch(csvUrl + '&cachebust=' + new Date().getTime());
        const text = await res.text();
        let rows = parseCSVRow(text);
        databaseRecords = rows.slice(1).filter(r => r.length > 1 && r[1]); 

        const btn = document.getElementById('submitBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Hantar Rekod';
    } catch (err) {
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal Memuat Data (Sila Refresh)';
    }
}

function clearAutofill() {
    document.getElementById('fullname').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('program').value = '';
    document.getElementById('year').value = '';
    document.getElementById('fullname').readOnly = false;
    document.getElementById('phone').readOnly = false;
}

document.getElementById('matrix').addEventListener('input', (e) => {
    const matrik = e.target.value.trim();
    const msgEl = document.getElementById('status-message');
    const btn = document.getElementById('submitBtn');

    if (matrik.length < 7) {
        clearAutofill();
        msgEl.style.display = 'none';
        btn.disabled = false;
        btn.classList.remove('btn-locked');
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Hantar Rekod';
        btn.setAttribute('data-had-penuh', 'tidak');
        btn.setAttribute('data-infaq-penuh', 'tidak');
        return;
    }

    let latestRecord = null;
    let ambilMakananUtamaHariIni = false;
    let ambilInfaqHariIni = false;

    // Cari dari data terbaharu
    for (let i = databaseRecords.length - 1; i >= 0; i--) {
        let row = databaseRecords[i];
        
        if (row && row.length > 1 && row[1] && row[1].trim() === matrik) {
            
            if (!latestRecord) {
                latestRecord = row; 
            }
            
            if (isToday(row[0])) {
                let rowDataStr = row.join(" ");
                // Periksa jika rekod mengandungi item UTAMA (Termasuk Roti)
                if (standardItems.some(item => rowDataStr.includes(item))) {
                    ambilMakananUtamaHariIni = true;
                }
                // Periksa jika rekod mengandungi item INFAQ
                if (rowDataStr.includes("Makanan Infaq")) {
                    ambilInfaqHariIni = true;
                }
                
                if (ambilMakananUtamaHariIni && ambilInfaqHariIni) {
                    break;
                }
            }
        }
    }

    btn.setAttribute('data-had-penuh', ambilMakananUtamaHariIni ? 'ya' : 'tidak');
    btn.setAttribute('data-infaq-penuh', ambilInfaqHariIni ? 'ya' : 'tidak');

    if (latestRecord) {
        document.getElementById('fullname').value = (latestRecord[2] || '').toUpperCase();
        document.getElementById('phone').value = latestRecord[3] || '';
        document.getElementById('program').value = latestRecord[4] || '';
        document.getElementById('year').value = latestRecord[5] || '';

        document.getElementById('fullname').readOnly = true;
        document.getElementById('phone').readOnly = true;

        msgEl.style.display = 'block';
        btn.disabled = false; 
        btn.classList.remove('btn-locked');

        // Paparkan status yang spesifik
        if (ambilMakananUtamaHariIni && ambilInfaqHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah mencapai had Maksimum harian bagi ambilan semua jenis makanan.';
        } else if (ambilMakananUtamaHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah membuat ambilan barangan utama pada hari ini. Anda masih boleh mengambil Makanan Infaq.';
        } else if (ambilInfaqHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah mengambil Makanan Infaq pada hari ini. Anda hanya boleh mengambil barangan utama sahaja.';
        } else {
            msgEl.className = 'status-msg status-success';
            msgEl.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Rekod Ditemui:</strong> Sila pilih item anda.';
        }

    } else {
        clearAutofill();
        msgEl.className = 'status-msg status-info';
        msgEl.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Pengguna Baharu:</strong> Sila isi maklumat penuh anda buat kali pertama.';
        msgEl.style.display = 'block';
        btn.disabled = false;
        btn.classList.remove('btn-locked');
    }
});

document.getElementById('foodbankForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    const currentTotal = standardItems.reduce((total, item) => total + (cart[item] || 0), 0);
    const infaqDicheck = cart["Makanan Infaq"] > 0;
    
    const btn = document.getElementById('submitBtn');
    const hadPenuh = btn.getAttribute('data-had-penuh') === 'ya';
    const infaqPenuh = btn.getAttribute('data-infaq-penuh') === 'ya';

    // 1. Semak sekiranya troli benar-benar kosong
    if(currentTotal === 0 && !infaqDicheck) {
        Swal.fire({
            icon: 'error',
            title: 'Troli Kosong',
            text: 'Sila pilih sekurang-kurangnya 1 item makanan sebelum menekan butang hantar.',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    // 2. Semak jika had Makanan Utama penuh
    if(hadPenuh && currentTotal > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Had Ambilan Dicapai',
            text: 'Anda telah mencapai had ambilan makanan utama harian pada hari ini.',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    // 3. Semak jika had Makanan Infaq penuh
    if(infaqPenuh && infaqDicheck) {
        Swal.fire({
            icon: 'error',
            title: 'Had Ambilan Dicapai',
            text: 'Anda telah mengambil Makanan Infaq pada hari ini (Maksimum 1 sahaja).',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghantar Data...';
    btn.disabled = true;

    // Hantar data secara native ke Google Form
    const formData = new FormData(this);

    fetch(this.action, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    }).then(() => {
        document.getElementById('form-container').style.display = 'none';
        document.getElementById('success-screen').style.display = 'block';
        
        if(slideIndex === 0) showSlides();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(err => {
        Swal.fire({
            icon: 'error',
            title: 'Ralat Sistem',
            text: 'Ralat sambungan. Sila pastikan sambungan internet anda stabil dan cuba lagi.',
            confirmButtonColor: '#e74c3c'
        });
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Hantar Rekod';
        btn.disabled = false;
    });
});

initCart();
fetchDatabase();
