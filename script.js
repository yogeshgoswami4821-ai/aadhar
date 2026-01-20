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
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("File select karo!");

    let combinedRows = [];
    const files = Array.from(fileInput.files);

    for (let file of files) {
        const text = await file.text();
        // PapaParse ko direct text de rahe hain bypass karne ke liye
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        combinedRows = combinedRows.concat(res.data);
    }
    
    processRawData(combinedRows);
}

function processRawData(rows) {
    if (rows.length < 2) return;

    let summary = {};
    let grandTotal = 0;

    // Index detection with fallback
    const firstRow = rows[0].map(h => h.toLowerCase().trim());
    let sIdx = firstRow.findIndex(h => h.includes('state'));
    let dIdx = firstRow.findIndex(h => h.includes('dist'));
    let eIdx = firstRow.findIndex(h => h.includes('enrol') || h.includes('count') || h.includes('total'));

    // FALLBACK: Agar header nahi mile toh 0, 1, 2 index maan lo
    if (sIdx === -1) sIdx = 0;
    if (dIdx === -1) dIdx = 1;
    if (eIdx === -1) eIdx = 2;

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (row.length < 2) continue;

        let s = (row[sIdx] || "Unknown").toString().trim();
        let d = (row[dIdx] || "Unknown").toString().trim();
        let rawVal = (row[eIdx] || "0").toString();

        // Strict Number Cleaning
        let val = parseInt(rawVal.replace(/[^0-9]/g, '')) || 0;

        if (s && d) {
            let label = `${s} > ${d}`;
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
    
    const container = document.getElementById("resultContainer");
    container.innerHTML = allData.slice(0, 50).map(item => `
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
    // Re-use card rendering logic here if needed
}

window.onload = initDashboard;
