let allData = [];
let myChart = null; // Graph instance track karne ke liye

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) return alert("Please select a file!");

    btn.innerText = "⚡ Power Analyzing...";
    btn.disabled = true;

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            btn.innerText = "Analyze Hierarchy";
            btn.disabled = false;
        }
    });
}

function processData(data) {
    if (!data || data.length === 0) return;

    const keys = Object.keys(data[0]);
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name.toLowerCase())));

    let sKey = findKey(["state", "st"]) || keys[0];
    let dKey = findKey(["district", "dist"]) || keys[1];
    let tKey = findKey(["tehsil", "taluka", "sub-dist", "block"]) || (keys.length > 3 ? keys[2] : null);
    let eKey = findKey(["enrol", "enroll", "count", "total", "number"]) || keys[keys.length - 1];

    let summary = {};
    data.forEach(row => {
        let sName = row[sKey] || "Unknown State";
        let dName = row[dKey] || "Unknown District";
        let tName = tKey ? row[tKey] : "";
        
        let label = tName ? `${sName} > ${dName} > ${tName}` : `${sName} > ${dName}`;
        let val = parseInt(row[eKey].toString().replace(/,/g, '')) || 0;
        summary[label] = (summary[label] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / (entries.length || 1);

    allData = entries.map(([place, val]) => ({
        place,
        enrolment: val,
        code: val < (avg * 0.5) ? "R" : (val < avg ? "Y" : "G")
    }));

    displayCards(allData);
    updateChart(allData); // Graph update karein
}

function updateChart(data) {
    const chartSection = document.getElementById("chartSection");
    chartSection.style.display = "block"; // Graph section show karein
    
    const ctx = document.getElementById('enrolmentChart').getContext('2d');
    
    // Top 10 regions for clear visibility
    const topData = data.slice(0, 10);
    const labels = topData.map(d => d.place.length > 25 ? d.place.substring(0, 25) + "..." : d.place);
    const values = topData.map(d => d.enrolment);
    
    // Color coding based on status
    const colors = topData.map(d => d.code === "R" ? "#ff4d4d" : (d.code === "Y" ? "#ffd700" : "#4caf50"));

    if (myChart) {
        myChart.destroy(); // Purana graph delete karein naye data ke liye
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Enrolment Count',
                data: values,
                backgroundColor: colors,
                borderColor: '#333',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { font: { family: 'Inter' } } },
                x: { ticks: { font: { family: 'Inter' } } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    data.slice(0, 50).forEach(item => {
        const color = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        container.innerHTML += `
            <div class="status-card ${color}">
                <div class="badge">${item.code}</div>
                <h3>${item.place}</h3>
                <p>Value: ${item.enrolment.toLocaleString()}</p>
            </div>`;
    });
}

function filterData() {
    const q = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(d => d.place.toUpperCase().includes(q) || d.code === q);
    displayCards(filtered);
    updateChart(filtered); // Search ke sath graph bhi filter hoga
}
