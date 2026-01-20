let allData = [];
let charts = {};

function initDashboard() {
    // Initial chart creation
    createCharts();
}

function createCharts() {
    // Purane charts agar hain toh unhe destroy karo taaki naya data dikhe
    if (charts.main) charts.main.destroy();
    if (charts.comparison) charts.comparison.destroy();

    const config = (type, color) => ({
        type: type,
        data: { labels: [], datasets: [{ label: 'Total Count', data: [], backgroundColor: color, borderColor: color, borderWidth: 1 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: type === 'bar' ? { y: { beginAtZero: true } } : {} 
        }
    });

    charts.main = new Chart(document.getElementById('enrolmentChart'), config('bar', '#ef4444'));
    charts.comparison = new Chart(document.getElementById('comparisonChart'), config('doughnut', ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981']));
}

function getCleanState(name) {
    if (!name) return null;
    let s = name.toString().toUpperCase().trim();
    
    // Dadra, Daman, aur Darbhanga ko list se bahar rakho
    const blockList = ["DADRA", "DAMAN", "NAGAR", "HAVELI", "DIU", "DARBHANGA", "AGE_", "100000"];
    if (blockList.some(b => s.includes(b))) return null;

    if (s.includes("BENG") || s.includes("BANGAL")) return "West Bengal";
    if (s.includes("JAMMU")) return "Jammu & Kashmir";
    
    return s.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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
        if (row.length < 3) return;
        let dateVal = row.find(v => v && (v.includes('/') || v.includes('-')) && v.length > 5);
        if (!dateVal) return;

        // Row mein sabse bada number dhoondo (Enrolment)
        let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let maxVal = Math.max(...nums);

        let textCols = row.filter(v => v && isNaN(v) && v.length > 2 && !v.includes('/') && !v.includes('-'));
        let stateClean = getCleanState(textCols[0]);
        let distName = textCols[1] || textCols[0];

        if (stateClean && maxVal > 0) {
            allData.push({ date: dateVal.trim(), state: stateClean, dist: distName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), val: maxVal });
            dates.add(dateVal.trim());
        }
    });

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
    
    // Bar Chart Update
    charts.main.data.labels = top.map(d => d.dist);
    charts.main.data.datasets[0].data = top.map(d => d.val);
    charts.main.update();

    // Pie/Doughnut Chart Update
    charts.comparison.data.labels = top.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    document.getElementById('totalCountDisplay').innerText = `Records: ${data.length}`;
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
        </div>`).join('');
}

window.onload = initDashboard;
