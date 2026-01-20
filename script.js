let allData = [];
let charts = {};

function initDashboard() {
    const config = (type, color) => ({
        type: type,
        data: { labels: [], datasets: [{ data: [], backgroundColor: color, borderColor: color, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (type === 'doughnut') } } }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), config('line', '#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('line', '#8b5cf6'));
    charts.main = new Chart(document.getElementById('enrolmentChart'), config('bar', '#ef4444'));
    charts.comparison = new Chart(document.getElementById('comparisonChart'), config('doughnut', ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981']));
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("File chuno bhai!");
    let rows = [];
    for (let f of files) {
        const text = await f.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        rows = rows.concat(res.data);
    }
    processData(rows);
}

function processData(rows) {
    let summary = {};
    // Column logic fix: Date ko skip karke State aur District dhundna
    rows.forEach((row, i) => {
        if (i === 0) return;
        let dateIdx = row.findIndex(v => v.includes('-') || v.includes('/')); // Date column identify
        let state = row[dateIdx + 1] || "Unknown";
        let dist = row[dateIdx + 2] || "Unknown";
        let numbers = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let val = Math.max(...numbers);

        if (val > 0) {
            let key = `${state.trim()} > ${dist.trim()}`;
            summary[key] = (summary[key] || 0) + val;
        }
    });

    allData = Object.entries(summary).map(([place, val]) => ({ place, val }));
    updateUI();
}

function updateUI() {
    populateSelectors();
    applyFilters();
}

function populateSelectors() {
    const states = [...new Set(allData.map(d => d.place.split(' > ')[0]))].sort();
    const container = document.getElementById('stateList');
    container.innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" value="${s}" onchange="applyFilters()"> ${s}
        </div>
    `).join('');
}

function applyFilters() {
    const selectedStates = Array.from(document.querySelectorAll('#stateList input:checked')).map(i => i.value);
    
    // Update District List based on States
    const distContainer = document.getElementById('distList');
    const filteredDistricts = allData.filter(d => selectedStates.length === 0 || selectedStates.includes(d.place.split(' > ')[0]));
    
    let filteredData = filteredDistricts;
    
    // Update Charts
    const top10 = filteredData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.val);
    charts.main.update();

    charts.comparison.data.labels = top10.slice(0,5).map(d => d.place);
    charts.comparison.data.datasets[0].data = top10.slice(0,5).map(d => d.val);
    charts.comparison.update();

    displayCards(filteredData);
}

function displayCards(data) {
    document.getElementById("resultContainer").innerHTML = data.slice(0, 20).map(d => `
        <div class="status-card">
            <span>${d.place}</span>
            <strong>${d.val.toLocaleString()}</strong>
        </div>
    `).join('');
}

window.onload = initDashboard;
