let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
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
    const container = document.getElementById("resultContainer");
    if (!data || data.length === 0) return;

    const keys = Object.keys(data[0]);
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name.toLowerCase())));

    // Smart Detection
    let sKey = findKey(["state", "st"]) || keys[0];
    let dKey = findKey(["district", "dist"]) || keys[1];
    let tKey = findKey(["tehsil", "taluka", "sub-dist", "block"]) || (keys.length > 3 ? keys[2] : null);
    let eKey = findKey(["enrol", "enroll", "count", "total", "number"]) || keys[keys.length - 1];

    let summary = {};
    data.forEach(row => {
        // Fallback agar koi field empty ho
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
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    data.slice(0, 100).forEach(item => {
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
}
