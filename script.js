const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWO1WcTeYxX7QQMmZjugETaEmGJOSG_TMWCrJohiG91PfrWJSpY5JKro59-USxq-StUOQw5EgyopO/pub?output=csv';
let databaseRecords = [];

// ==========================================
// 1. FUNGSI PENUKAR BAHASA (MS / EN)
// ==========================================
let currentLang = 'ms';

function toggleLanguage() {
    // Tukar bahasa semasa
    currentLang = currentLang === 'ms' ? 'en' : 'ms';
    
    // Tukar teks pada butang penukar bahasa
    document.getElementById('langToggleBtn').innerText = currentLang === 'ms' ? 'English' : 'Bahasa Melayu';
    
    // Tukar semua teks statik (inner HTML)
    document.querySelectorAll('[data-ms]').forEach(el => {
        el.innerHTML = el.getAttribute(`data-${currentLang}`);
    });

    // Tukar semua placeholder pada ruang input
    document.querySelectorAll('[data-ph-ms]').forEach(el => {
        el.placeholder = el.getAttribute(`data-ph-${currentLang}`);
    });
}
// ==========================================

// Konfigurasi Baharu Had Spesifik Barangan
const itemLimits = {
    "Air Kotak": 1,
    "Roti": 1,
    "Kismis": 1,
    "Makanan Infaq": 1,
    "Biskut Lexus": 2,
    "Biskut Oat Krunch": 2,
    "Kurma": 2
};

// Menjana senarai barangan berdasarkan konfigurasi di atas
const itemList = Object.keys(itemLimits);
// Mengasingkan barangan utama daripada Infaq untuk tujuan validasi
const mainItems = itemList.filter(item => item !== "Makanan Infaq");

let cart = {};

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
    
    slideTimeout = setTimeout(showSlides, 8000); 
}

function currentSlide(n) {
    clearTimeout(slideTimeout);
    slideIndex = n - 1;
    showSlides();
}

function initCart() {
    const container = document.getElementById('cart-container');
    
    // Header Troli yang baharu (ditambah sokongan terjemahan automatik untuk 'Item Diambil')
    container.innerHTML = `
        <div class="cart-header">
            <span data-ms="Senarai Item" data-en="Item List">Senarai Item</span>
            <span id="total-count-display">0 Item Diambil</span>
        </div>
    `;

    itemList.forEach(item => {
        cart[item] = 0;
        const itemId = item.replace(/ /g, '_');
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <span class="item-name">${item}</span>
                <small style="color: #e74c3c; font-size: 11px; margin-top: 2px;">(Maksimum: ${itemLimits[item]} unit)</small>
            </div>
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
    // Had maks spesifik bagi setiap jenis barang
    if (change > 0 && cart[itemName] >= itemLimits[itemName]) {
        Swal.fire({
            icon: 'warning',
            title: currentLang === 'ms' ? 'Had Maksimum Dicapai' : 'Maximum Limit Reached',
            text: currentLang === 'ms' ? 
                  `Anda hanya dibenarkan mengambil MAKSIMUM ${itemLimits[itemName]} unit sahaja untuk [${itemName}].` : 
                  `You are only allowed to take a MAXIMUM of ${itemLimits[itemName]} unit(s) for [${itemName}].`,
            confirmButtonColor: '#2c3e50'
        });
        return;
    }

    if (cart[itemName] + change < 0) return;

    // Lakukan pertambahan/pengurangan
    cart[itemName] += change;
    document.getElementById(`qty_${itemName.replace(/ /g, '_')}`).innerText = cart[itemName];
    
    // Kira semula total selepas perubahan untuk paparan skrin (Disokong Dwibahasa)
    let currentTotal = itemList.reduce((total, item) => total + (cart[item] || 0), 0);
    let itemText = currentLang === 'ms' ? 'Item Diambil' : 'Items Taken';
    document.getElementById('total-count-display').innerText = `${currentTotal} ${itemText}`;
    
    // Asingkan data submission mengikut soalan Google Form
    let selectedItems = [];
    mainItems.forEach(item => {
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
        btn.innerHTML = currentLang === 'ms' ? '<i class="fas fa-paper-plane"></i> Hantar Rekod' : '<i class="fas fa-paper-plane"></i> Submit Record';
    } catch (err) {
        document.getElementById('submitBtn').innerHTML = currentLang === 'ms' ? '<i class="fas fa-exclamation-triangle"></i> Gagal Memuat Data' : '<i class="fas fa-exclamation-triangle"></i> Failed to Load Data';
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
        btn.innerHTML = currentLang === 'ms' ? '<i class="fas fa-paper-plane"></i> Hantar Rekod' : '<i class="fas fa-paper-plane"></i> Submit Record';
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
                // Periksa jika rekod mengandungi sebarang item UTAMA
                if (mainItems.some(item => rowDataStr.includes(item))) {
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

        // Paparkan status peringatan yang spesifik (Dwibahasa)
        if (ambilMakananUtamaHariIni && ambilInfaqHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = currentLang === 'ms' ? 
                '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah mencapai had 1 kali ambilan penuh pada hari ini.' : 
                '<i class="fas fa-exclamation-circle"></i> <strong>Reminder:</strong> You have reached the maximum of 1 full collection today.';
        } else if (ambilMakananUtamaHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = currentLang === 'ms' ? 
                '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah membuat ambilan barangan utama hari ini. Anda masih boleh ambil Makanan Infaq.' :
                '<i class="fas fa-exclamation-circle"></i> <strong>Reminder:</strong> You have collected main items today. You can still take Makanan Infaq.';
        } else if (ambilInfaqHariIni) {
            msgEl.className = 'status-msg status-error';
            msgEl.innerHTML = currentLang === 'ms' ? 
                '<i class="fas fa-exclamation-circle"></i> <strong>Peringatan:</strong> Anda telah mengambil Makanan Infaq hari ini. Anda hanya boleh mengambil barangan utama sahaja.' :
                '<i class="fas fa-exclamation-circle"></i> <strong>Reminder:</strong> You have taken Makanan Infaq today. You can only collect main items now.';
        } else {
            msgEl.className = 'status-msg status-success';
            msgEl.innerHTML = currentLang === 'ms' ? 
                '<i class="fas fa-check-circle"></i> <strong>Rekod Ditemui:</strong> Sila pilih item anda.' :
                '<i class="fas fa-check-circle"></i> <strong>Record Found:</strong> Please select your items.';
        }

    } else {
        clearAutofill();
        msgEl.className = 'status-msg status-info';
        msgEl.innerHTML = currentLang === 'ms' ? 
            '<i class="fas fa-info-circle"></i> <strong>Pengguna Baharu:</strong> Sila isi maklumat penuh anda buat kali pertama.' :
            '<i class="fas fa-info-circle"></i> <strong>New User:</strong> Please fill in your full details for the first time.';
        msgEl.style.display = 'block';
        btn.disabled = false;
        btn.classList.remove('btn-locked');
    }
});

document.getElementById('foodbankForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    const currentTotal = mainItems.reduce((total, item) => total + (cart[item] || 0), 0);
    const infaqDicheck = cart["Makanan Infaq"] > 0;
    
    const btn = document.getElementById('submitBtn');
    const hadPenuh = btn.getAttribute('data-had-penuh') === 'ya';
    const infaqPenuh = btn.getAttribute('data-infaq-penuh') === 'ya';

    // 1. Semak sekiranya troli benar-benar kosong
    if(currentTotal === 0 && !infaqDicheck) {
        Swal.fire({
            icon: 'error',
            title: currentLang === 'ms' ? 'Troli Kosong' : 'Empty Cart',
            text: currentLang === 'ms' ? 'Sila pilih sekurang-kurangnya 1 item makanan sebelum menekan butang hantar.' : 'Please select at least 1 food item before submitting.',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    // 2. Semak jika pengguna sudah mengambil ambilan pada hari ini
    if(hadPenuh && currentTotal > 0) {
        Swal.fire({
            icon: 'error',
            title: currentLang === 'ms' ? 'Had Ambilan Dicapai' : 'Collection Limit Reached',
            text: currentLang === 'ms' ? 'Anda telah mencapai had 1 kali ambilan harian pada hari ini.' : 'You have reached your daily collection limit for today.',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    // 3. Semak jika had Makanan Infaq harian telah dicapai
    if(infaqPenuh && infaqDicheck) {
        Swal.fire({
            icon: 'error',
            title: currentLang === 'ms' ? 'Had Ambilan Dicapai' : 'Collection Limit Reached',
            text: currentLang === 'ms' ? 'Anda telah mengambil Makanan Infaq pada hari ini.' : 'You have already collected Makanan Infaq today.',
            confirmButtonColor: '#e74c3c'
        });
        return;
    }

    btn.innerHTML = currentLang === 'ms' ? '<i class="fas fa-spinner fa-spin"></i> Menghantar Data...' : '<i class="fas fa-spinner fa-spin"></i> Submitting...';
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
            title: currentLang === 'ms' ? 'Ralat Sistem' : 'System Error',
            text: currentLang === 'ms' ? 'Ralat sambungan. Sila pastikan sambungan internet anda stabil dan cuba lagi.' : 'Connection error. Please ensure your internet connection is stable and try again.',
            confirmButtonColor: '#e74c3c'
        });
        btn.innerHTML = currentLang === 'ms' ? '<i class="fas fa-paper-plane"></i> Hantar Rekod' : '<i class="fas fa-paper-plane"></i> Submit Record';
        btn.disabled = false;
    });
});

initCart();
fetchDatabase();
