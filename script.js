let allData = [];
let charts = {};

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
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("File toh select karo bhai!");

    const btn = document.getElementById("uploadBtn");
    btn.innerText = "Analyzing...";
    
    let combinedRows = [];
    const files = Array.from(fileInput.files);

    const parsePromises = files.map(file => {
        return new Promise((resolve) => {
            Papa.parse(file, { 
                header: false, // Index base reading ke liye false kiya
                skipEmptyLines: true, 
                complete: (res) => resolve(res.data) 
            });
        });
    });

    const resultsArray = await Promise.all(parsePromises);
    resultsArray.forEach(data => combinedRows = combinedRows.concat(data));
    processRawData(combinedRows);
    btn.innerText = "⚡ Analyze Combined Data";
}

function processRawData(rows) {
    if (rows.length < 2) return;

    let summary = {};
    let grandTotal = 0;

    // Headers se index dhoondte hain
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const sIdx = headers.findIndex(h => h.includes('state'));
    const dIdx = headers.findIndex(h => h.includes('dist'));
    const eIdx = headers.findIndex(h => h.includes('enrol') || h.includes('count') || h.includes('total'));

    // Baki ki rows process karte hain (skip header row 0)
    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let s = row[sIdx] || "Unknown";
        let d = row[dIdx] || "Unknown";
        let rawVal = row[eIdx] || "0";

        // Comma aur non-numeric characters hatane ke liye
        let val = parseInt(rawVal.toString().replace(/[^0-9]/g, '')) || 0;

        if (s !== "Unknown") {
            let label = `${s.trim()} > ${d.trim()}`;
            summary[label] = (summary[label] || 0) + val;
            grandTotal += val;
        }
    }

    allData = Object.entries(summary).map(([place, val]) => ({
        place, 
        enrolment: val, 
        code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);

    updateUI(grandTotal);
}

function updateUI(total) {
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    document.getElementById('mainPercent').innerText = total > 0 ? "100%" : "0%";
    
    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    charts.main.data.datasets[0].backgroundColor = top10.map(d => 
        d.code === 'R' ? '#ef4444' : (d.code === 'Y' ? '#f59e0b' : '#10b981')
    );
    charts.main.update();
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
