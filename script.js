let allData = [];
let charts = {};

function initDashboard() {
    createCharts();
}

function createCharts() {
    // Purane charts destroy karke fresh canvas setup taaki blank na dikhe
    ['enrolmentChart', 'comparisonChart'].forEach(id => {
        let canvas = document.getElementById(id);
        if (canvas) {
            let freshCanvas = canvas.cloneNode(true);
            canvas.parentNode.replaceChild(freshCanvas, canvas);
        }
    });

    const ctx1 = document.getElementById('enrolmentChart').getContext('2d');
    const ctx2 = document.getElementById('comparisonChart').getContext('2d');

    charts.main = new Chart(ctx1, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Enrolments', data: [], backgroundColor: '#ef4444' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    charts.comparison = new Chart(ctx2, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981'] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 1. CLEANING LOGIC: Dadra, Daman aur Darbhanga ko block karne ke liye
function getCleanState(name) {
    if (!name) return null;
    let s = name.toString().toUpperCase().trim();

    // Block List
    const block = ["DADRA", "DAMAN", "NAGAR", "HAVELI", "DIU", "DARBHANGA", "100000", "AGE_", "TOTAL", "STEP"];
    if (block.some(b => s.includes(b))) return null;

    // Merge Variations (West Bengal, Chhattisgarh etc.)
    if (s.includes("BENG") || s.includes("BANGAL")) return "West Bengal";
    if (s.includes("CHHATTIS")) return "Chhattisgarh";
    if (s.includes("JAMMU")) return "Jammu & Kashmir";
    if (s.includes("UTTARANCHAL")) return "Uttarakhand";
    if (s.includes("PUDU") || s.includes("PONDI")) return "Puducherry";

    return s.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Bhai, file select karo!");
    
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
        if (row.length < 3) return;

        // Date Detection
        let dateVal = row.find(v => v && (v.includes('/') || v.includes('-')) && v.length > 5);
        
        // Numbers Detection (Enrolment)
        let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let maxVal = Math.max(...nums);

        // State & District Detection
        let texts = row.filter(v => v && isNaN(v) && v.length > 2 && !v.includes('/') && !v.includes('-'));
        let stateClean = getCleanState(texts[0]);
        let distName = texts[1] || texts[0];

        if (stateClean && maxVal > 0) {
            allData.push({
                date: (dateVal || "All").trim(),
                state: stateClean,
                dist: distName.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                val: maxVal
            });
            if(dateVal) dates.add(dateVal.trim());
        }
    });

    // Refresh UI
    createCharts(); 
    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

function populateStateList() {
    const states = [...new Set(allData.map(d => d.state))].sort();
    document.getElementById('stateList').innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" class="state-check" value="${s}" onchange="updateDistrictList()"> ${s}
        </div>`).join('');
}

function updateDistrictList() {
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const districts = [...new Set(allData.filter(d => !selStates.length || selStates.includes(d.state)).map(d => d.dist))].sort();
    document.getElementById('distList').innerHTML = districts.map(d => `
        <div class="multi-select-item">
            <input type="checkbox" class="dist-check" value="${d}" onchange="applyFilters()"> ${d}
        </div>`).join('');
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

    // Deduplication/Merging
    let grouped = {};
    filtered.forEach(item => {
        let key = item.dist + "|" + item.state;
        if (!grouped[key]) grouped[key] = { ...item };
        else grouped[key].val = Math.max(grouped[key].val, item.val);
    });

    let finalData = Object.values(grouped).sort((a, b) => b.val - a.val);
    updateDashboard(finalData);
}

function updateDashboard(data) {
    const top = data.slice(0, 10);
    
    // Update Charts
    charts.main.data.labels = top.map(d => d.dist);
    charts.main.data.datasets[0].data = top.map(d => d.val);
    charts.main.update();

    charts.comparison.data.labels = top.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    // Update Status Cards
    document.getElementById("resultContainer").innerHTML = data.slice(0, 50).map(d => `
        <div class="status-card">
            <div><strong>${d.dist}</strong> <br> <small>${d.state}</small></div>
            <div style="color:#2563eb; font-weight:bold">${d.val.toLocaleString()}</div>
        </div>`).join('');
}

function populateDateDropdown(dates) {
    document.getElementById('dateSelect').innerHTML = '<option value="">All Dates</option>' + 
        dates.sort().map(d => `<option value="${d}">${d}</option>`).join('');
}

window.onload = initDashboard;
