let allData = [];
let charts = {};

// 1. Dashboard Initialization
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

// 2. CSV Upload & Multi-file handling
async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Bhai, pehle CSV file toh select karo!");
    
    let rows = [];
    for (let f of files) {
        const text = await f.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        rows = rows.concat(res.data);
    }
    parseData(rows);
}

// 3. Data Parsing (Cleaning State Names & Dates)
function parseData(rows) {
    allData = [];
    let dates = new Set();

    rows.forEach((row, i) => {
        if (i === 0 || row.length < 3) return;

        // Date detect karne ka logic
        let dateIdx = row.findIndex(v => /[\d\-\/]/.test(v) && v.length > 5);
        if (dateIdx === -1) return;

        let dateVal = row[dateIdx].trim();
        let stateVal = row[dateIdx + 1] ? row[dateIdx + 1].trim() : "";
        let distVal = row[dateIdx + 2] ? row[dateIdx + 2].trim() : "";
        
        // Faltu naam hatane ke liye check (Sirf text allow)
        if (!/^[a-zA-Z\s.]+$/.test(stateVal) || stateVal.length < 3) return;

        let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let enrollment = Math.max(...nums);

        if (enrollment > 0) {
            dates.add(dateVal);
            allData.push({ date: dateVal, state: stateVal, dist: distVal, val: enrollment });
        }
    });

    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

// 4. Populate State Checkboxes
function populateStateList() {
    const states = [...new Set(allData.map(d => d.state))].sort();
    const container = document.getElementById('stateList');
    container.innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" class="state-check" value="${s}" onchange="updateDistrictList()"> ${s}
        </div>
    `).join('');
}

// 5. Update District List (Hierarchical)
function updateDistrictList() {
    const selectedStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const container = document.getElementById('distList');
    
    if (selectedStates.length === 0) {
        container.innerHTML = '<p style="font-size:10px; color:gray; padding:5px;">Pehle State select karein...</p>';
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

// 6. Final Filter & Aggregation (Bhopal Duplicate Fix)
function applyFilters() {
    const selDate = document.getElementById('dateSelect').value;
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const selDists = Array.from(document.querySelectorAll('.dist-check:checked')).map(i => i.value);

    let filtered = allData;
    if (selDate) filtered = filtered.filter(d => d.date === selDate);
    if (selStates.length > 0) filtered = filtered.filter(d => selStates.includes(d.state));
    if (selDists.length > 0) filtered = filtered.filter(d => selDists.includes(d.dist));

    // Grouping Logic: Bhopal ki multiple entries ko ek saath jodna
    let groupedMap = {};
    filtered.forEach(item => {
        let key = item.dist;
        if (!groupedMap[key]) {
            groupedMap[key] = { dist: item.dist, state: item.state, val: 0, date: item.date };
        }
        groupedMap[key].val += item.val; 
    });

    let finalData = Object.values(groupedMap).sort((a, b) => b.val - a.val);
    updateCharts(finalData, filtered);
    displayCards(finalData);
}

// 7. Update Charts
function updateCharts(groupedData, rawFiltered) {
    const top10 = groupedData.slice(0, 10);
    
    // Main Bar Chart
    charts.main.data.labels = top10.map(d => d.dist);
    charts.main.data.datasets[0].label = 'Total Enrolments (Grouped)';
    charts.main.data.datasets[0].data = top10.map(d => d.val);
    charts.main.update();

    // Doughnut Comparison
    charts.comparison.data.labels = top10.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top10.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    // Top Trend Charts (Using raw filtered data for wavy lines)
    let trendValues = rawFiltered.slice(0, 15).map(d => d.val);
    charts.top1.data.labels = trendValues.map((_, i) => i);
    charts.top1.data.datasets[0].data = trendValues;
    charts.top1.update();

    charts.top2.data.labels = trendValues.map((_, i) => i);
    charts.top2.data.datasets[0].data = trendValues.map(v => v * 0.8);
    charts.top2.update();

    document.getElementById('mainPercent').innerText = groupedData.length > 0 ? "100%" : "0%";
    document.getElementById('totalCountDisplay').innerText = `${groupedData.length} Unique Districts Found`;
}

// 8. Helper Functions
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
    const cards = document.querySelectorAll('.status-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
    });
}

window.onload = initDashboard;
