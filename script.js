let allData = [];
let charts = {};

function initDashboard() {
    const config = (type, color) => ({
        type: type,
        data: { labels: [], datasets: [{ data: [], backgroundColor: color, borderColor: color, tension: 0.4, fill: true, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (type === 'doughnut') } } }
    });
    charts.main = new Chart(document.getElementById('enrolmentChart'), config('bar', '#ef4444'));
    charts.comparison = new Chart(document.getElementById('comparisonChart'), config('doughnut', ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981']));
    charts.top1 = new Chart(document.getElementById('topChart1'), config('line', '#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('line', '#8b5cf6'));
}

// --- FIX: Sabhi kachra saaf karne ka naya logic ---
function getCleanState(name) {
    if (!name) return null;
    let clean = name.toString().toUpperCase().replace(/[^\x20-\x7E]/g, '').trim();

    // 1. DADRA, DAMAN aur DARBHANGA ko seedha bahar karo
    if (clean.includes("DADRA") || clean.includes("DAMAN") || clean.includes("DARBHANGA") || clean.includes("100000") || clean.includes("AGE_")) {
        return null; 
    }

    // 2. West Bengal variations (Bengli, Bangal etc.) ko ek karo
    if (clean.includes("BENG") || clean.includes("BANGAL")) return "West Bengal";
    
    // 3. Jammu & Kashmir variations
    if (clean.includes("JAMMU")) return "Jammu & Kashmir";

    // 4. Puducherry / Pondicherry
    if (clean.includes("PUDU") || clean.includes("PONDI")) return "Puducherry";

    // 5. Chhattisgarh spelling fix
    if (clean.includes("CHHATTIS")) return "Chhattisgarh";

    // Standard list for validation
    const validStates = [
        "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR", "CHHATTISGARH", "GOA", "GUJARAT", "HARYANA", 
        "HIMACHAL PRADESH", "JHARKHAND", "KARNATAKA", "KERALA", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", 
        "MEGHALAYA", "MIZORAM", "NAGALAND", "ODISHA", "PUNJAB", "RAJASTHAN", "SIKKIM", "TAMIL NADU", 
        "TELANGANA", "TRIPURA", "UTTAR PRADESH", "UTTARAKHAND", "WEST BENGAL", "ANDAMAN & NICOBAR ISLANDS", 
        "CHANDIGARH", "LAKSHADWEEP", "DELHI", "PUDUCHERRY", "LADAKH", "JAMMU & KASHMIR"
    ];

    // Agar standard list mein hai toh formatted return karo
    if (validStates.includes(clean)) {
        return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    // Agar list mein nahi hai but valid lag raha hai (length > 3), toh bhi le lo taaki data dikhe
    if (clean.length > 3 && isNaN(clean)) {
        return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    return null;
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Bhai, file toh select kar!");
    
    let rows = [];
    for (let f of files) {
        const text = await f.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        rows = rows.concat(res.data);
    }
    parseData(rows);
}

function parseData(rows) {
    allData = [];
    let dates = new Set();

    rows.forEach((row, i) => {
        if (i === 0 || row.length < 3) return;
        
        // Date column dhundho
        let dateIdx = row.findIndex(v => v && v.toString().includes('/') || v.toString().includes('-'));
        if (dateIdx === -1) return;

        let stateVal = getCleanState(row[dateIdx + 1]);
        let distRaw = row[dateIdx + 2] ? row[dateIdx + 2].toString().trim() : "";
        let distVal = distRaw.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

        if (stateVal && distVal && isNaN(distVal)) {
            let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
            allData.push({ 
                date: row[dateIdx].trim(), 
                state: stateVal, 
                dist: distVal, 
                val: Math.max(...nums) 
            });
            dates.add(row[dateIdx].trim());
        }
    });

    if(allData.length === 0) {
        alert("Data load nahi ho paya. Check karo CSV format sahi hai na?");
    }

    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

function populateStateList() {
    const states = [...new Set(allData.map(d => d.state))].sort();
    document.getElementById('stateList').innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" class="state-check" value="${s}" onchange="updateDistrictList()"> ${s}
        </div>
    `).join('');
}

function updateDistrictList() {
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const container = document.getElementById('distList');
    const districts = [...new Set(allData.filter(d => !selStates.length || selStates.includes(d.state)).map(d => d.dist))].sort();
    
    container.innerHTML = districts.map(d => `
        <div class="multi-select-item">
            <input type="checkbox" class="dist-check" value="${d}" onchange="applyFilters()"> ${d}
        </div>
    `).join('');
    applyFilters();
}

function applyFilters() {
    const selDate = document.getElementById('dateSelect').value;
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const selDists = Array.from(document.querySelectorAll('.dist-check:checked')).map(i => i.value);

    let filtered = allData;
    if (selDate) filtered = filtered.filter(d => d.date === selDate);
    if (selStates.length > 0) filtered = filtered.filter(d => selStates.includes(d.state));
    if (selDists.length > 0) filtered = filtered.filter(d => selDists.includes(d.dist));

    // Grouping to avoid duplicates in Chart
    let grouped = {};
    filtered.forEach(item => {
        let key = item.dist + "-" + item.state;
        if (!grouped[key]) grouped[key] = { ...item };
        else grouped[key].val = Math.max(grouped[key].val, item.val);
    });

    let finalData = Object.values(grouped).sort((a, b) => b.val - a.val);
    updateCharts(finalData);
    displayCards(finalData);
}

function updateCharts(data) {
    const top = data.slice(0, 10);
    charts.main.data.labels = top.map(d => d.dist);
    charts.main.data.datasets[0].data = top.map(d => d.val);
    charts.main.update();

    charts.comparison.data.labels = top.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    document.getElementById('totalCountDisplay').innerText = `${data.length} Regions Loaded`;
}

function populateDateDropdown(dates) {
    document.getElementById('dateSelect').innerHTML = '<option value="">All Dates</option>' + 
        dates.sort().map(d => `<option value="${d}">${d}</option>`).join('');
}

function displayCards(data) {
    document.getElementById("resultContainer").innerHTML = data.slice(0, 50).map(d => `
        <div class="status-card">
            <div><strong>${d.dist}</strong> <br> <small>${d.state}</small></div>
            <div style="color:#2563eb; font-weight:bold">${d.val.toLocaleString()}</div>
        </div>
    `).join('');
}

window.onload = initDashboard;
