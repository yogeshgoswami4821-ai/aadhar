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

// 1. CLEANING LOGIC: Sab kachra saaf aur merge karne ke liye
function getCleanState(name) {
    if (!name) return null;
    let s = name.toString().toUpperCase().trim();

    // Dadra, Daman, aur Darbhanga ko seedha BLOCK karo
    if (s.includes("DADRA") || s.includes("DAMAN") || s.includes("DARBHANGA") || s.includes("AGE_") || s.includes("100000")) {
        return null;
    }

    // West Bengal ke saare spelling variations merge karo
    if (s.includes("BENG") || s.includes("BANGAL")) return "West Bengal";
    if (s.includes("CHHATTIS")) return "Chhattisgarh";
    if (s.includes("JAMMU")) return "Jammu & Kashmir";
    if (s.includes("PUDU") || s.includes("PONDI")) return "Puducherry";
    if (s.includes("ANDAMAN")) return "Andaman & Nicobar Islands";

    // Baaki sabko title case mein badlo (e.g. BIHAR -> Bihar)
    return s.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Pehle file chuno bhai!");
    
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
        // Sirf un rows ko lo jisme data ho
        if (row.length < 3) return;

        // Date column pehchano (e.g. 2024-01-20 or 20/01/24)
        let dateIdx = row.findIndex(v => v && (v.includes('/') || v.includes('-')) && v.length > 5);
        if (dateIdx === -1) return;

        let rawState = row[dateIdx + 1];
        let rawDist = row[dateIdx + 2];

        let stateVal = getCleanState(rawState);
        let distVal = rawDist ? rawDist.toString().trim() : "";

        // Agar state valid hai aur district koi number nahi hai
        if (stateVal && distVal && isNaN(distVal) && distVal.length > 2) {
            // Row mein se sabse bada number dhoondo (vahi enrolment count hai)
            let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
            let val = Math.max(...nums);

            allData.push({
                date: row[dateIdx].trim(),
                state: stateVal,
                dist: distVal.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                val: val
            });
            dates.add(row[dateIdx].trim());
        }
    });

    if (allData.length === 0) {
        alert("Data load nahi hua! Shayad CSV columns alag hain.");
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
    
    const districts = [...new Set(allData
        .filter(d => selStates.length === 0 || selStates.includes(d.state))
        .map(d => d.dist))].sort();
    
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

    // Same city/state ko merge karo (Group by)
    let grouped = {};
    filtered.forEach(item => {
        let key = item.dist + "|" + item.state;
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
