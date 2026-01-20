let allData = [];
let charts = {};

function initEmptyCharts() {
    const config = (color) => ({
        type: 'line',
        data: { labels: ['','','','',''], datasets: [{ data: [0,0,0,0,0], borderColor: color, tension: 0.4, fill: true, backgroundColor: color+'22' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), config('#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('#8b5cf6'));
    charts.main = new Chart(document.getElementById('enrolmentChart'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Enrolments', data: [], backgroundColor: '#3b82f6', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) return alert("Select CSV files!");

    let combinedRows = [];
    const files = Array.from(fileInput.files);

    const parsePromises = files.map(file => {
        return new Promise((resolve) => {
            Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => resolve(res.data) });
        });
    });

    const resultsArray = await Promise.all(parsePromises);
    resultsArray.forEach(data => combinedRows = combinedRows.concat(data));

    processAndDisplay(combinedRows);
}

function processAndDisplay(data) {
    // Process hierarchy
    let summary = {};
    data.forEach(row => {
        let label = `${row.State} > ${row.District}`;
        let val = parseInt(row.Enrolment) || 0;
        summary[label] = (summary[label] || 0) + val;
    });

    allData = Object.entries(summary).map(([place, val]) => ({
        place, enrolment: val, code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);

    // Update UI
    document.getElementById('mainPercent').innerText = "65%"; // Mock percentage
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    
    // Update Charts with real data
    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    charts.main.update();

    displayCards(allData);
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = data.slice(0, 20).map(item => `
        <div class="status-card ${item.code === 'R' ? 'red-card' : item.code === 'Y' ? 'yellow-card' : 'green-card'}">
            <span>${item.place}</span>
            <strong>${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

window.onload = initEmptyCharts;
