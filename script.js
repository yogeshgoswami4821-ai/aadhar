let allData = [];
let myChart = null;

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");

    if (fileInput.files.length === 0) return alert("Please select at least one file!");

    btn.innerText = "⚡ Merging & Analyzing...";
    btn.disabled = true;
    
    let combinedRows = [];
    const files = Array.from(fileInput.files);

    // Promise.all use karke saari files ek saath read karenge
    const parsePromises = files.map(file => {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data)
            });
        });
    });

    const resultsArray = await Promise.all(parsePromises);
    resultsArray.forEach(data => combinedRows = combinedRows.concat(data));

    processData(combinedRows);
    btn.innerText = "Analyze Combined Hierarchy";
    btn.disabled = false;
}

function processData(data) {
    if (!data || data.length === 0) return;

    const keys = Object.keys(data[0]);
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name.toLowerCase())));

    let sKey = findKey(["state", "st"]) || keys[0];
    let dKey = findKey(["district", "dist"]) || keys[1];
    let tKey = findKey(["tehsil", "taluka", "sub-dist", "block"]);
    let eKey = findKey(["enrol", "enroll", "count", "total", "number"]) || keys[keys.length - 1];

    let summary = {};
    data.forEach(row => {
        if(!row[sKey] || !row[dKey]) return;
        let label = tKey && row[tKey] ? `${row[sKey]} > ${row[dKey]} > ${row[tKey]}` : `${row[sKey]} > ${row[dKey]}`;
        let val = parseInt(row[eKey]?.toString().replace(/,/g, '')) || 0;
        summary[label] = (summary[label] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / (entries.length || 1);

    allData = entries.map(([place, val]) => ({
        place,
        enrolment: val,
        code: val < (avg * 0.5) ? "R" : (val < avg ? "Y" : "G")
    })).sort((a, b) => b.enrolment - a.enrolment); // Higher enrolment first

    displayCards(allData);
    updateChart(allData);
}

function updateChart(data) {
    document.getElementById("chartSection").style.display = "block";
    const ctx = document.getElementById('enrolmentChart').getContext('2d');
    const topData = data.slice(0, 10);
    
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topData.map(d => d.place.split(' > ').pop()),
            datasets: [{
                label: 'Combined Enrolment',
                data: topData.map(d => d.enrolment),
                backgroundColor: topData.map(d => d.code === "R" ? "#ff4d4d" : (d.code === "Y" ? "#ffd700" : "#4caf50")),
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    data.slice(0, 60).forEach(item => {
        const color = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        container.innerHTML += `<div class="status-card ${color}"><div class="badge">${item.code}</div><h3>${item.place}</h3><p>Total: ${item.enrolment.toLocaleString()}</p></div>`;
    });
}

function filterData() {
    const q = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(d => d.place.toUpperCase().includes(q) || d.code === q);
    displayCards(filtered);
    updateChart(filtered);
}
