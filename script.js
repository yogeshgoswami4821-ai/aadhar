let allData = [];
let charts = {};

// 1. Initialize empty charts on load
function initEmptyCharts() {
    const config = (color) => ({
        type: 'line',
        data: { 
            labels: ['Day 1','Day 2','Day 3','Day 4','Day 5'], 
            datasets: [{ 
                data: [10, 25, 15, 30, 20], // Dummy initial line for visual
                borderColor: color, 
                tension: 0.4, 
                fill: true, 
                backgroundColor: color + '22',
                pointRadius: 0
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { x: { display: false }, y: { display: false } } 
        }
    });

    charts.top1 = new Chart(document.getElementById('topChart1'), config('#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('#8b5cf6'));
    
    charts.main = new Chart(document.getElementById('enrolmentChart'), {
        type: 'bar',
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Enrolments', 
                data: [], 
                backgroundColor: '#3b82f6', 
                borderRadius: 5 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 2. Upload and Parse CSV
async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");

    if (fileInput.files.length === 0) return alert("Select CSV files!");

    btn.innerText = "Processing...";
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

    processAndDisplay(combinedRows);
    
    btn.innerText = "Analyze Combined Data";
    btn.disabled = false;
}

// 3. Process Data for Dashboard
function processAndDisplay(data) {
    let summary = {};
    
    data.forEach(row => {
        // Case-insensitive check for State and District
        let state = row.State || row.state || "Unknown";
        let dist = row.District || row.district || "Unknown";
        let label = `${state} > ${dist}`;
        let val = parseInt(row.Enrolment || row.enrolment || 0);
        summary[label] = (summary[label] || 0) + val;
    });

    allData = Object.entries(summary).map(([place, val]) => ({
        place, 
        enrolment: val, 
        code: val < 5000 ? "R" : (val < 15000 ? "Y" : "G")
    })).sort((a,b) => b.enrolment - a.enrolment);

    // Update UI Elements
    document.getElementById('mainPercent').innerText = "65%"; 
    document.getElementById('totalCountDisplay').innerText = `${allData.length} Regions Analyzed`;
    
    // Update Charts
    const top10 = allData.slice(0, 10);
    charts.main.data.labels = top10.map(d => d.place.split(' > ')[1]);
    charts.main.data.datasets[0].data = top10.map(d => d.enrolment);
    
    // Add colors to bar chart based on R-Y-G status
    charts.main.data.datasets[0].backgroundColor = top10.map(d => 
        d.code === 'R' ? '#ef4444' : (d.code === 'Y' ? '#f59e0b' : '#10b981')
    );
    
    charts.main.update();

    displayCards(allData);
}

// 4. Display Result Cards
function displayCards(data) {
    const container = document.getElementById("resultContainer");
    if (data.length === 0) {
        container.innerHTML = '<div class="placeholder-text">No results found.</div>';
        return;
    }

    container.innerHTML = data.slice(0, 50).map(item => `
        <div class="status-card ${item.code === 'R' ? 'red-card' : item.code === 'Y' ? 'yellow-card' : 'green-card'}">
            <span>${item.place}</span>
            <strong>${item.enrolment.toLocaleString()}</strong>
        </div>
    `).join('');
}

// 5. Search/Filter Functionality
function filterData() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allData.filter(d => 
        d.place.toLowerCase().includes(query) || 
        d.code.toLowerCase() === query
    );
    displayCards(filtered);
}

// Run on page load
window.onload = initEmptyCharts;
