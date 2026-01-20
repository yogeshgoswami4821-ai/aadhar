let allData = [];
let charts = {};

// Dashboard initialize karein
function initDashboard() {
    const miniConfig = (color) => ({
        type: 'line',
        data: { labels: [1,2,3,4,5,6,7], datasets: [{ data: [10,12,11,14,13,16,15], borderColor: color, tension: 0.4, fill: true, backgroundColor: color+'11', pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), miniConfig('#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), miniConfig('#8b5cf6'));
    
    charts.main = new Chart(document.getElementById('enrolmentChart'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Enrolments', data: [], backgroundColor: '#ef4444', borderRadius: 6 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });
}

// CSV Upload logic
async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("Please select CSV files!");

    const btn = document.getElementById("uploadBtn");
    btn.innerText = "Merging & Analyzing...";
    btn.disabled = true; 
    
    let combinedRows = [];
    const files = Array.from(fileInput.files);

    const parsePromises = files.map(file => {
        return new Promise((resolve) => {
            Papa.parse(file, { 
                header: true, 
                skipEmptyLines: true, 
                complete: (res) => resolve(res.data) 
            });
        });
    });

    const resultsArray = await Promise.all(parsePromises);
    resultsArray.forEach(data => combinedRows = combinedRows.concat(data));

    processData(combinedRows);
    btn.innerText = "⚡ Analyze Combined Data";
    btn.disabled = false;
}

// Data Processing with fix for "0" values
function processData(data) {
    let summary = {};
    let grandTotal = 0;

    if (data.length === 0) return alert("CSV is empty!");

    // Universal Key Finder: Column names handle karne ke liye
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    const stateKey = keys.find(k => k.trim().toLowerCase() === 'state');
    const distKey = keys.find(k => k.trim().toLowerCase() === 'district');
    const enrolKey = keys.find(k => ['enrolment', 'enrolments', 'count', 'total'].includes(k.trim().toLowerCase()));

    data.forEach(row => {
        let state = (row[stateKey] || "").toString().trim();
        let dist = (row[distKey] || "").toString().trim();
        let enrolValue = row[enrolKey] || 0;
        
        if (state && dist) {
            let label = `${state} > ${dist}`;
            // Comma hatana aur number mein convert karna
            let val = parseInt(enrolValue.toString().replace(/,/g, '')) || 0;
            summary[label] = (summary[label] || 0) + val;
            grandTotal += val;
        }
    });

    allData = Object.entries(summary).map(([place, val]) => ({
        place, 
        enrolment: val, 
        code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);

    updateUI(grandTotal);
}

// Dashboard UI update karein
function updateUI(total) {
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    
    // Percentage update based on data volume
    let mockPercent = total > 0 ? Math.min(Math.round((total / (allData.length * 10000)) * 100), 100) : 0;
    document.getElementById('mainPercent').innerText = (mockPercent || 65) + "%";
    
    // Update Main Bar Chart
    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]); // District name only
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    
    // R-Y-G Colors for bars
    charts.main.data.datasets[0].backgroundColor = top10.map(d => 
        d.code === 'R' ? '#ef4444' : (d.code === 'Y' ? '#f59e0b' : '#10b981')
    );
    
    charts.main.update();
    displayCards(allData);
}

// Monitoring Cards display karein
function displayCards(data) {
    const container = document.getElementById("resultContainer");
    if (data.length === 0) {
        container.innerHTML = '<div class="placeholder-text">No data matches your search.</div>';
        return;
    }

    container.innerHTML = data.slice(0, 50).map(item => `
        <div class="status-card ${item.code === 'R' ? 'red-card' : item.code === 'Y' ? 'yellow-card' : 'green-card'}">
            <div style="display:flex; flex-direction:column">
                <span style="font-weight:600; font-size:13px;">${item.place}</span>
                <span style="font-size:10px; color:#94a3b8">Status: ${item.code === 'R' ? 'Critical' : (item.code === 'Y' ? 'Attention' : 'Stable')}</span>
            </div>
            <strong style="font-size:14px;">${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

// Search functionality
function filterData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allData.filter(d => d.place.toLowerCase().includes(q));
    displayCards(filtered);
}

window.onload = initDashboard;
