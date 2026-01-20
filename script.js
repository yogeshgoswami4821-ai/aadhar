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
    if (fileInput.files.length === 0) return alert("Bhai, pehle CSV file toh select kar lo!");

    const btn = document.getElementById("uploadBtn");
    btn.innerText = "Processing...";
    btn.style.opacity = "0.7";
    
    let combinedRows = [];
    const files = Array.from(fileInput.files);

    const parsePromises = files.map(file => {
        return new Promise((resolve) => {
            Papa.parse(file, { 
                header: true, 
                skipEmptyLines: true, 
                dynamicTyping: true, // Numbers ko automatic pehchanega
                complete: (res) => resolve(res.data) 
            });
        });
    });

    const resultsArray = await Promise.all(parsePromises);
    resultsArray.forEach(data => combinedRows = combinedRows.concat(data));

    processData(combinedRows);
    btn.innerText = "⚡ Analyze Combined Data";
    btn.style.opacity = "1";
}

function processData(data) {
    if (!data || data.length === 0) return;

    let summary = {};
    let grandTotal = 0;

    // Sabse important step: Headers ko dhoondna
    const sample = data[0];
    const keys = Object.keys(sample);
    
    // Ye line 'state', 'district' aur 'enrolment' ko kisi bhi spelling mein dhund legi
    const stateKey = keys.find(k => k.toLowerCase().includes('state'));
    const distKey = keys.find(k => k.toLowerCase().includes('dist'));
    const enrolKey = keys.find(k => k.toLowerCase().includes('enrol') || k.toLowerCase().includes('count') || k.toLowerCase().includes('total'));

    data.forEach(row => {
        let s = row[stateKey] || "Unknown";
        let d = row[distKey] || "Unknown";
        let val = row[enrolKey];

        // Agar value string hai (jaise "86,613"), toh comma hatayega
        if (typeof val === 'string') {
            val = parseInt(val.replace(/,/g, '')) || 0;
        } else {
            val = parseInt(val) || 0;
        }

        if (s !== "Unknown") {
            let label = `${s.toString().trim()} > ${d.toString().trim()}`;
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
    // Total regions text
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    
    // Percentage logic (Donut update)
    document.getElementById('mainPercent').innerText = total > 0 ? "100%" : "0%";
    
    // Update Chart
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
                <span style="font-size:10px; color:#94a3b8">Status: ${item.code === 'R' ? 'Critical' : (item.code === 'Y' ? 'Attention' : 'Stable')}</span>
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
