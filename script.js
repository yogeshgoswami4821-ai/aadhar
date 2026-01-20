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
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
    });
}

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("Please select CSV files!");

    const btn = document.getElementById("uploadBtn");
    btn.innerText = "Processing Data...";
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

function processData(data) {
    if (!data || data.length === 0) return;

    let summary = {};
    let grandTotal = 0;

    // Sabse pehle headers ko dhoondte hain (chahe small letter ho ya capital)
    const headers = Object.keys(data[0]);
    const stateKey = headers.find(h => h.toLowerCase().trim() === 'state');
    const distKey = headers.find(h => h.toLowerCase().trim() === 'district');
    const enrolKey = headers.find(h => ['enrolment', 'enrolments', 'count', 'total'].includes(h.toLowerCase().trim()));

    // Agar columns nahi mile toh error dikhaye
    if (!stateKey || !distKey || !enrolKey) {
        alert(`Error: CSV Columns match nahi huye! Humne dhunda: State, District, Enrolment. Aapke CSV mein hai: ${headers.join(', ')}`);
        return;
    }

    data.forEach(row => {
        let state = (row[stateKey] || "").toString().trim();
        let dist = (row[distKey] || "").toString().trim();
        let enrolVal = row[enrolKey] || "0";
        
        if (state && dist) {
            let label = `${state} > ${dist}`;
            // Comma hatana aur number mein convert karna
            let val = parseInt(enrolVal.toString().replace(/,/g, '')) || 0;
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

function updateUI(total) {
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    
    // Percentage update (Agar total 0 hai toh 65 default)
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
                <span style="font-weight:600; font-size:13px;">${item.place}</span>
                <span style="font-size:10px; color:#94a3b8">Status: ${item.code === 'R' ? 'Critical' : (item.code === 'Y' ? 'Attention' : 'Stable')}</span>
            </div>
            <strong style="font-size:14px;">${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

function filterData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allData.filter(d => d.place.toLowerCase().includes(q));
    displayCards(filtered);
}

window.onload = initDashboard;
