let allData = [];
let charts = {};

function initDashboard() {
    createCharts();
}

function createCharts() {
    // Purane charts destroy karke naya canvas load karna
    ['enrolmentChart', 'comparisonChart'].forEach(id => {
        let canvas = document.getElementById(id);
        let freshCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(freshCanvas, canvas);
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

function getCleanState(name) {
    if (!name) return null;
    let s = name.toString().toUpperCase().trim();
    
    // Sabhi faltu naam yahan se block
    const block = ["DADRA", "DAMAN", "NAGAR", "HAVELI", "DARBHANGA", "100000", "AGE_", "STEP", "TOTAL"];
    if (block.some(b => s.includes(b))) return null;

    // Duplicates merge logic
    if (s.includes("BENG") || s.includes("BANGAL")) return "West Bengal";
    if (s.includes("CHHATTIS")) return "Chhattisgarh";
    if (s.includes("JAMMU")) return "Jammu & Kashmir";
    
    return s.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return;
    
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
        
        // Date find
        let dateVal = row.find(v => v && (v.includes('/') || v.includes('-')) && v.length > 5);
        if (!dateVal) return;

        // Numbers find (Enrolment)
        let nums = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let maxVal = Math.max(...nums);

        // State/Dist find
        let textCols = row.filter(v => v && isNaN(v) && v.length > 2 && !v.includes('/') && !v.includes('-'));
        let stateClean = getCleanState(textCols[0]);
        let distName = textCols[1] || textCols[0];

        if (stateClean && maxVal > 0) {
            allData.push({ 
                date: dateVal.trim(), 
                state: stateClean, 
                dist: distName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
                val: maxVal 
            });
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
    updateDashboard(finalData);
}

function updateDashboard(data) {
    const top = data.slice(0, 10);
    
    charts.main.data.labels = top.map(d => d.dist);
    charts.main.data.datasets[0].data = top.map(d => d.val);
    charts.main.update();

    charts.comparison.data.labels = top.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top.slice(0, 5).map(d => d.val);
    charts.comparison.update();

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
