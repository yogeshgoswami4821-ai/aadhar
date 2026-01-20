let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) return alert("Select a file!");

    btn.innerText = "⚡ Processing...";
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

    // Flexible Header Detection
    const keys = Object.keys(data[0]);
    const findKey = (name) => keys.find(k => k.toLowerCase().trim().includes(name.toLowerCase()));

    const sKey = findKey("state");
    const dKey = findKey("district");
    const tKey = findKey("tehsil");
    const eKey = findKey("enrol") || findKey("count");

    if (!sKey || !dKey || !tKey || !eKey) {
        container.innerHTML = `<div style="color:red; border:2px solid red; padding:15px; border-radius:8px;">
            <h3>⚠️ CSV HEADER ERROR</h3>
            <p>Missing: ${[!sKey?"State ":" ", !dKey?"District ":" ", !tKey?"Tehsil ":" ", !eKey?"Enrolment":""].join("")}</p>
        </div>`;
        return;
    }

    let summary = {};
    data.forEach(row => {
        let path = `${row[sKey]} > ${row[dKey]} > ${row[tKey]}`;
        let val = parseInt(row[eKey]) || 0;
        summary[path] = (summary[path] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / entries.length;

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
        container.innerHTML += `<div class="status-card ${color}">
            <div class="badge">${item.code}</div>
            <h3>${item.place}</h3>
            <p>Enrolment: ${item.enrolment.toLocaleString()}</p>
        </div>`;
    });
}

function filterData() {
    const q = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(d => d.place.toUpperCase().includes(q) || d.code === q);
    displayCards(filtered);
}
