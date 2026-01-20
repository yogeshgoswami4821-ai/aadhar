let allData = [];
let charts = {};

function initDashboard() {
    const miniConfig = (color) => ({
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: color, tension: 0.4, fill: true, backgroundColor: color+'22', pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), miniConfig('#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), miniConfig('#8b5cf6'));
    charts.main = new Chart(document.getElementById('enrolmentChart'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Enrolments', data: [], backgroundColor: '#ef4444', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
    charts.comparison = new Chart(document.getElementById('comparisonChart'), {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("File chuno bhai!");
    let combinedRows = [];
    for (let file of fileInput.files) {
        const text = await file.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        combinedRows = combinedRows.concat(res.data);
    }
    processUniversalData(combinedRows);
}

function processUniversalData(rows) {
    if (rows.length < 2) return;
    let summary = {};
    let trendValues = [];
    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let strings = row.filter(v => isNaN(v.toString().replace(/,/g, '')));
        let numbers = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        let s = strings[0] || "Unknown", d = strings[1] || "Unknown", val = Math.max(...numbers);
        if (val > 0) {
            let label = `${s.trim()} > ${d.trim()}`;
            summary[label] = (summary[label] || 0) + val;
            trendValues.push(val);
        }
    }
    allData = Object.entries(summary).map(([place, val]) => ({
        place, enrolment: val, code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);
    updateUI(trendValues);
}

function updateUI(trends) {
    let total = allData.reduce((s, d) => s + d.enrolment, 0);
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    document.getElementById('mainPercent').innerText = total > 0 ? "100%" : "0%";

    charts.top1.data.labels = trends.slice(0, 10).map((_, i) => i);
    charts.top1.data.datasets[0].data = trends.slice(0, 10);
    charts.top1.update();

    charts.top2.data.labels = trends.slice(0, 10).map((_, i) => i);
    charts.top2.data.datasets[0].data = trends.slice(0, 10).map(v => v * 0.7);
    charts.top2.update();

    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    charts.main.update();

    populateDropdowns();
    filterBySelection();
}

function populateDropdowns() {
    const stateSelect = document.getElementById('stateSelect');
    const states = [...new Set(allData.map(item => item.place.split(' > ')[0]))].sort();
    stateSelect.innerHTML = '<option value="">All States</option>';
    states.forEach(s => stateSelect.innerHTML += `<option value="${s}">${s}</option>`);
}

function updateDistrictDropdown() {
    const state = document.getElementById('stateSelect').value;
    const distSelect = document.getElementById('distSelect');
    distSelect.innerHTML = '<option value="">Select District</option>';
    if (state) {
        const districts = [...new Set(allData.filter(i => i.place.startsWith(state)).map(i => i.place.split(' > ')[1]))].sort();
        districts.forEach(d => distSelect.innerHTML += `<option value="${d}">${d}</option>`);
    }
    filterBySelection();
}

function filterBySelection() {
    const state = document.getElementById('stateSelect').value;
    const dist = document.getElementById('distSelect').value;
    let filtered = allData;
    if (state) filtered = filtered.filter(d => d.place.startsWith(state));
    if (dist) filtered = filtered.filter(d => d.place.includes(`> ${dist}`));
    
    displayCards(filtered);
    const top5 = filtered.slice(0, 5);
    charts.comparison.data.labels = top5.map(d => d.place);
    charts.comparison.data.datasets[0].data = top5.map(d => d.enrolment);
    charts.comparison.update();
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = data.slice(0, 50).map(item => `
        <div class="status-card ${item.code === 'R' ? 'red-card' : item.code === 'Y' ? 'yellow-card' : 'green-card'}">
            <div><span style="font-weight:600">${item.place}</span></div>
            <strong>${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

function filterData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    displayCards(allData.filter(d => d.place.toLowerCase().includes(q)));
}

window.onload = initDashboard;
