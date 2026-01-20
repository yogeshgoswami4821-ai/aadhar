let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    btn.innerText = "⚡ Processing...";
    btn.disabled = true;
    container.innerHTML = "🔄 Analyzing data locally (No server delay)...";

    // PapaParse browser processing starts
    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            btn.innerText = "Analyze Hierarchy";
            btn.disabled = false;
        },
        error: function(err) {
            container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
            btn.disabled = false;
        }
    });
}

function processData(data) {
    const container = document.getElementById("resultContainer");
    
    // Header detection logic
    const firstRow = data[0];
    if (!firstRow) {
        container.innerHTML = "Empty File!";
        return;
    }

    const getCol = (name) => Object.keys(firstRow).find(k => k.toLowerCase().trim() === name.toLowerCase());

    const stateCol = getCol("State");
    const distCol = getCol("District");
    const tehsilCol = getCol("Tehsil");
    const enrolCol = getCol("Enrolment") || getCol("Enrollment");

    // Missing column check
    if (!stateCol || !distCol || !tehsilCol || !enrolCol) {
        container.innerHTML = `
            <div style="color:red; border:2px solid red; padding:15px; border-radius:8px;">
                <h3>⚠️ SYSTEM WARNING</h3>
                <p>Missing Columns. Check if CSV has: State, District, Tehsil, Enrolment</p>
            </div>`;
        return;
    }

    // Process hierarchy
    let summary = {};
    data.forEach(row => {
        let key = `${row[stateCol]} > ${row[distCol]} > ${row[tehsilCol]}`;
        let val = parseInt(row[enrolCol]) || 0;
        summary[key] = (summary[key] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.reduce((a, b) => a + b[1], 0) / entries.length;

    allData = entries.map(([place, val]) => {
        let code = "G";
        let status = "Stable";
        if (val < (avg * 0.5)) { code = "R"; status = "Critical"; }
        else if (val < avg) { code = "Y"; status = "Warning"; }
        return { place, enrolment: val, code, analysis: status };
    });

    displayCards(allData);
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = "No patterns found.";
        return;
    }

    data.slice(0, 200).forEach(item => {
        const colorClass = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${colorClass}`;
        card.innerHTML = `
            <div class="badge">${item.code}</div>
            <div class="card-info">
                <h3>${item.place}</h3>
                <p><strong>Enrolment:</strong> ${item.enrolment.toLocaleString()}</p>
                <p><strong>Status:</strong> ${item.analysis}</p>
            </div>`;
        container.appendChild(card);
    });
}

function filterData() {
    const query = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(i => 
        i.place.toUpperCase().includes(query) || i.code === query
    );
    displayCards(filtered);
}
