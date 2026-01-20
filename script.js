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

// --- FIXED CLEANING LOGIC (AS PER YOUR SCREENSHOTS) ---
function cleanStateName(name) {
    if (!name) return null;

    // Invisible junk aur extra space hatana
    let clean = name.toString().toUpperCase().replace(/[^\x20-\x7E]/g, '').trim();

    // 1. DADRA & DAMAN MERGE (Zabardasti ek naam)
    if (clean.includes("DADRA") || clean.includes("DAMAN") || clean.includes("NAGAR HAVELI")) {
        return "Dadra & Nagar Haveli & Daman & Diu";
    }

    // 2. WEST BENGAL MERGE (Sari galat spelling fix)
    if (clean.includes("WEST") && (clean.includes("BENGAL") || clean.includes("BANGAL") || clean.includes("BENGLI"))) {
        return "West Bengal";
    }

    // 3. ANDAMAN, JAMMU, PUDUCHERRY MERGE
    if (clean.includes("ANDAMAN")) return "Andaman & Nicobar Islands";
    if (clean.includes("JAMMU")) return "Jammu & Kashmir";
    if (clean.includes("PONDICHERRY") || clean.includes("PUDUCHERRY")) return "Puducherry";
    if (clean.includes("CHHATTISGARH")) return "Chhattisgarh";

    // 4. BLOCKLIST (Jo SS mein faltu dikh raha tha wo sab block)
    const blockList = ["DARBHANGA", "STEP", "MONITORING", "TOTAL", "UNKNOWN", "UNDEFINED", "SELECT", "PLACE", "AGE_", "100000"];
    if (blockList.some(b => clean.includes(b)) || clean.length < 4) return null;

    // Proper formatting (Maharashtra, Goa, etc.)
    return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("File chuno!");
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

        let dateIdx = row.findIndex(v => /[\d\-\/]/.test(v) && v.length > 5);
        if (dateIdx === -1) return;

        let dateVal = row[dateIdx].trim();
        let stateVal = cleanStateName(row[dateIdx + 1]);
        let distRaw = row[dateIdx + 2] ? row[dateIdx + 2].toString().trim() : "";
        let distVal = distRaw.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

        // District list mein number na aaye uska check
        if (stateVal && distVal && isNaN(distVal)) {
            let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
            allData.push({ date: dateVal, state: stateVal, dist: distVal, val: Math.max(...nums) });
            dates.add(dateVal);
        }
    });

    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

function populateStateList() {
    // Unique Set ensure karta hai ki 'West Bengal' ek hi baar dikhe
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
    
    if (!selStates.length) {
        container.innerHTML = '<p style="font-size:11px; color:gray; padding:5px;">Select State first...</p>';
    } else {
        const districts = [...new Set(allData.filter(d => selStates.includes(d.state)).map(d => d.dist))].sort();
        container.innerHTML = districts.map(d => `
            <div class="multi-select-item">
                <input type="checkbox" class="dist-check" value="${d}" onchange="applyFilters()"> ${d}
            </div>
        `).join('');
    }
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

    // Grouping logic Bhopal fix ke liye (Multiple lines merge ho jayengi)
    let grouped = {};
    filtered.forEach(item => {
        let key = item.dist + item.state;
        if(!grouped[key]) grouped[key] = { ...item };
        else grouped[key].val += item.val;
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

    document.getElementById('totalCountDisplay').innerText = `${data.length} Valid Regions`;
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
