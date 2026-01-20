let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) return alert("Please select a file!");

    btn.innerText = "⚡ Analyzing Locally...";
    btn.disabled = true;
    container.innerHTML = "🔄 Reading file... No server needed!";

    // Browser mein hi file read ho rahi hai
    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            btn.innerText = "Analyze Hierarchy";
            btn.disabled = false;
        },
        error: function(err) {
            container.innerHTML = `<p style="color:red;">Error reading file: ${err.message}</p>`;
            btn.disabled = false;
        }
    });
}

function processData(data) {
    const container = document.getElementById("resultContainer");
    
    // Column Names check karein (Case-insensitive)
    const firstRow = data[0];
    const getCol = (name) => Object.keys(firstRow).find(k => k.toLowerCase().trim() === name.toLowerCase());

    const stateCol = getCol("State");
    const distCol = getCol("District");
    const tehsilCol = getCol("Tehsil");
    const enrolCol = getCol("Enrolment") || getCol("Enrollment");

    if (!stateCol || !distCol || !tehsilCol || !enrolCol) {
        container.innerHTML = `<div style="color:red; border:1px solid red; padding:10px;">
            ⚠️ Missing Columns: Need State, District, Tehsil, Enrolment
        </div>`;
        return;
    }

    // Processing logic
    let summary = {};
    data.forEach(row => {
        let key = `${row[stateCol]} > ${row[distCol]} > ${row[tehsilCol]}`;
        let val = parseInt(row[enrolCol]) || 0;
        summary[key] = (summary[key] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / entries.length;

    allData = entries.map(([place, val]) => ({
        place: place,
        enrolment: val,
        code: val < (avg * 0.5) ? "R" : (val < avg ? "Y" : "G"),
        analysis: val < (avg * 0.5) ? "Critical" : (val < avg ? "Warning" : "Stable")
    }));

    displayCards(allData);
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    data.slice(0, 100).forEach(item => {
        const color = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${color}`;
        card.innerHTML = `<h3>${item.place}</h3><p>Enrolment: ${item.enrolment.toLocaleString()}</p><p>Status: ${item.analysis}</p>`;
        container.appendChild(card);
    });
}
