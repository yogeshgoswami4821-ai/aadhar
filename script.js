let allData = [];
let charts = {};

function initDashboard() {
    const config = (type, color) => ({
        type: type,
        data: { labels: [], datasets: [{ data: [], backgroundColor: color, borderColor: color, tension: 0.4, fill: true, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (type === 'doughnut') } } }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), config('line', '#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('line', '#8b5cf6'));
    charts.main = new Chart(document.getElementById('enrolmentChart'), config('bar', '#ef4444'));
    charts.comparison = new Chart(document.getElementById('comparisonChart'), config('doughnut', ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981']));
}

// 1. Sabse Strict Filter: Jo ss mein naam dikh rahe hain unka ilaaj
function cleanStateName(name) {
    if (!name) return null;

    let clean = name.toString()
        .replace(/[^\x20-\x7E]/g, '') // Invisible junk hatana
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');

    // Darbhanga aur Step 2 jaise faltu naam ko turant reject karo
    const blockList = ["DARBHANGA", "STEP 2", "STEP 2: MONITORING", "TOTAL", "UNKNOWN", "UNDEFINED"];
    if (blockList.some(b => clean.includes(b)) || /\d/.test(clean) || clean.length < 4) {
        return null;
    }

    // Dadra, Daman aur Nagar Haveli ko ek hi naam mein merge karna
    if (clean.includes("DADRA") || clean.includes("DAMAN") || clean.includes("NAGAR HAVELI")) {
        return "Dadra & Nagar Haveli & Daman & Diu";
    }

    // Andaman duplicates fix
    if (clean.includes("ANDAMAN")) return "Andaman & Nicobar Islands";

    // Jammu duplicates fix
    if (clean.includes("JAMMU")) return "Jammu & Kashmir";

    // West Bengal variations fix
    if (clean.includes("WEST BENGAL") || clean.includes("WESTBANGAL") || clean.includes("WESTBENGLI")) {
        return "West Bengal";
    }

    // Chhattisgarh hidden character fix
    if (clean.includes("CHHATTISGARH")) return "Chhattisgarh";

    // Puducherry/Pondicherry fix
    if (clean.includes("PONDICHERRY") || clean.includes("PUDUCHERRY")) return "Puducherry";

    // Baaki sab ke liye Proper Case
    return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Pehle file select karo!");
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
        let stateRaw = row[dateIdx + 1] ? row[dateIdx + 1] : "";
        let distRaw = row[dateIdx + 2] ? row[dateIdx + 2] : "";
        
        let stateVal = cleanStateName(stateRaw);
        let distVal = distRaw.toString().trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

        if (stateVal) {
            let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
            let enrollment = Math.max(...nums);
            
            if (enrollment > 0) {
                dates.add(dateVal);
                allData.push({ date: dateVal, state: stateVal, dist: distVal, val: enrollment });
            }
        }
    });

    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

function populateStateList() {
    // Unique states - Ab Dadra/Daman alag-alag nahi dikhenge
    const states = [...new Set(allData.map(d => d.state))].sort();
    const container = document.getElementById('stateList');
    
    container.innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" class="state-check" value="${s}" onchange="updateDistrictList()"> ${s}
        </div>
    `).join('');
}

function updateDistrictList() {
    const selectedStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const container = document.getElementById('distList');
    
    if (selectedStates.length === 0) {
        container.innerHTML = '<p style="font-size:11px; color:gray; padding:5px;">Select State...</p>';
    } else {
        const districts = [...new Set(allData.filter(d => selectedStates.includes(d.state)).map(d => d.dist))].sort();
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

    let groupedMap = {};
    filtered.forEach(item => {
        let key = item.dist;
        if (!groupedMap[key]) {
            groupedMap[key] = { dist: item.dist, state: item.state, val: 0 };
        }
        groupedMap[key].val += item.val; 
    });

    let finalData = Object.values(groupedMap).sort((a, b) => b.val - a.val);
    updateCharts(finalData, filtered);
    displayCards(finalData);
}

function updateCharts(groupedData, rawFiltered) {
    const top10 = groupedData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.dist);
    charts.main.data.datasets[0].data = top10.map(d => d.val);
    charts.main.update();

    charts.comparison.data.labels = top10.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top10.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    let trendValues = rawFiltered.slice(0, 20).map(d => d.val);
    charts.top1.data.labels = trendValues.map((_, i) => i);
    charts.top1.data.datasets[0].data = trendValues;
    charts.top1.update();

    charts.top2.data.labels = trendValues.map((_, i) => i);
    charts.top2.data.datasets[0].data = trendValues.map(v => v * 0.8);
    charts.top2.update();

    document.getElementById('totalCountDisplay').innerText = `${groupedData.length} Clean Records`;
}

function populateDateDropdown(dates) {
    const select = document.getElementById('dateSelect');
    select.innerHTML = '<option value="">All Dates</option>' + dates.sort().map(d => `<option value="${d}">${d}</option>`).join('');
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = data.slice(0, 50).map(d => `
        <div class="status-card">
            <div><strong>${d.dist}</strong> <br> <small>${d.state}</small></div>
            <div style="color:#2563eb; font-weight:bold">${d.val.toLocaleString()}</div>
        </div>
    `).join('');
}

function filterData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll('.status-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    });
}

window.onload = initDashboard;
