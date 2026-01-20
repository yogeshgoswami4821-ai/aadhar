let allData = [];
let charts = {};

function initDashboard() {
    const miniConfig = (color) => ({
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: color, tension: 0.4, fill: true, backgroundColor: color+'22', pointRadius: 2 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { x: { display: false }, y: { display: false } } 
        }
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
    if (fileInput.files.length === 0) return alert("Bhai file toh chuno!");
    
    let combinedRows = [];
    for (let file of fileInput.files) {
        const text = await file.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        combinedRows = combinedRows.concat(res.data);
    }
    processData(combinedRows);
}

function processData(rows) {
    if (rows.length < 2) return;
    let summary = {};
    let trendData = []; // Top charts ke liye trend data

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let strings = row.filter(v => isNaN(v.toString().replace(/,/g, '')));
        let numbers = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, '')) || 0);
        
        let state = strings[0] || "Unknown";
        let dist = strings[1] || "Unknown";
        let val = Math.max(...numbers);

        if (val > 0) {
            let label = `${state.trim()} > ${dist.trim()}`;
            summary[label] = (summary[label] || 0) + val;
            trendData.push(val); // Trend line ke liye raw values
        }
    }

    allData = Object.entries(summary).map(([place, val]) => ({
        place, enrolment: val, 
        code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);

    updateUI(trendData);
}

function updateUI(trends) {
    let total = allData.reduce((sum, d) => sum + d.enrolment, 0);
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    document.getElementById('mainPercent').innerText = total > 0 ? "100%" : "0%";

    // Update Top 2 Line Charts with trend data
    const sampleTrend = trends.slice(0, 15); // Pehle 15 values trend dikhane ke liye
    charts.top1.data.labels = sampleTrend.map((_, i) => i);
    charts.top1.data.datasets[0].data = sampleTrend;
    charts.top1.update();

    charts.top2.data.labels = sampleTrend.map((_, i) => i);
    charts.top2.data.datasets[0].data = sampleTrend.map(v => v * 0.8); // Random trend for Updates
    charts.top2.update();

    // Bottom Bar Chart
    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    charts.main.update();

    // Comparison Doughnut
    const top5 = allData.slice(0, 5);
    charts.comparison.data.labels = top5.map(d => d.place);
    charts.comparison.data.datasets[0].data = top5.map(d => d.enrolment);
    charts.comparison.update();

    displayCards(allData);
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = data.slice(0, 50).map(item => `
        <div class="status-card ${item.code === 'R' ? 'red-card' : item.code === 'Y' ? 'yellow-card' : 'green-card'}">
            <div style="display:flex; flex-direction:column">
                <span style="font-weight:600">${item.place}</span>
                <span style="font-size:10px; color:#94a3b8">Status: ${item.code === 'R' ? 'Critical' : 'Stable'}</span>
            </div>
            <strong>${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

function filterData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allData.filter(d => d.place.toLowerCase().includes(q));
    displayCards(filtered);
}

window.onload = initDashboard;
