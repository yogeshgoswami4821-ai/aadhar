let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) return alert("Please select a file!");

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

    const keys = Object.keys(data[0]);
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name)));

    // Mandatory Columns
    const sKey = findKey(["state", "st"]);
    const dKey = findKey(["district", "dist"]);
    const eKey = findKey(["enrol", "enroll", "count", "total"]);

    // Optional Column (Tehsil)
    const tKey = findKey(["tehsil", "sub-dist", "taluka", "block"]);

    if (!sKey || !dKey || !eKey) {
        container.innerHTML = `
            <div style="color:red; border:2px solid red; padding:15px; border-radius:8px; background:#fff5f5;">
                <h3>⚠️ CRITICAL HEADER MISSING</h3>
                <p>Ensure file has: <b>State, District, Enrolment</b></p>
                <p><small>(Tehsil is now optional)</small></p>
            </div>`;
        return;
    }

    let summary = {};
    data.forEach(row => {
        // Agar Tehsil nahi hai toh sirf State > District dikhao
        let placeLabel = tKey ? `${row[sKey]} > ${row[dKey]} > ${row[tKey]}` : `${row[sKey]} > ${row[dKey]}`;
        let val = parseInt(row[eKey]) || 0;
        summary[placeLabel] = (summary[placeLabel] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / entries.length;

    allData = entries.map(([place, val]) => ({
        place,
        enrolment: val,
        code: val < (avg * 0.5) ? "R" : (val < avg ? "Y" : "G"),
        status: val < (avg * 0.5) ? "Critical" : (val < avg ? "Warning" : "Stable")
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
                <div class="card-info">
                    <h3>${item.place}</h3>
                    <p><strong>Enrolment:</strong> ${item.enrolment.toLocaleString()}</p>
                    <p><strong>Status:</strong> ${item.status}</p>
                </div>
            </div>`;
    });
}
