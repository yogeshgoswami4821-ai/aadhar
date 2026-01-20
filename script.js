let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files || !fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    btn.innerText = "⚡ Processing...";
    btn.disabled = true;

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            btn.innerText = "Analyze Hierarchy";
            btn.disabled = false;
        },
        error: function(err) {
            console.error(err);
            alert("Error reading CSV file");
            btn.disabled = false;
        }
    });
}

function processData(data) {
    const container = document.getElementById("resultContainer");
    if (!data || data.length === 0) {
        container.innerHTML = "File is empty!";
        return;
    }

    const keys = Object.keys(data[0]);
    
    // Fuzzy search for headers
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name)));

    const sKey = findKey(["state", "st"]);
    const dKey = findKey(["district", "dist"]);
    const eKey = findKey(["enrol", "enroll", "count", "total"]);
    const tKey = findKey(["tehsil", "sub-dist", "taluka", "block"]); // Tehsil is optional

    // Mandatory Check
    if (!sKey || !dKey || !eKey) {
        container.innerHTML = `
            <div style="color:red; border:2px solid red; padding:15px; border-radius:8px; background:#fff5f5;">
                <h3>⚠️ HEADER ERROR</h3>
                <p>Mandatory Columns Missing: ${!sKey ? 'State ' : ''} ${!dKey ? 'District ' : ''} ${!eKey ? 'Enrolment' : ''}</p>
            </div>`;
        return;
    }

    let summary = {};
    data.forEach(row => {
        // Dynamic path based on Tehsil availability
        let path = tKey ? `${row[sKey]} > ${row[dKey]} > ${row[tKey]}` : `${row[sKey]} > ${row[dKey]}`;
        let val = parseInt(row[eKey]) || 0;
        summary[path] = (summary[path] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.length > 0 ? (entries.reduce((a, b) => a + b[1], 0) / entries.length) : 0;

    allData = entries.map(([place, val]) => {
        let code = "G";
        let status = "Stable";
        if (val < (avg * 0.5)) { code = "R"; status = "Critical"; }
        else if (val < avg) { code = "Y"; status = "Warning"; }
        return { place, enrolment: val, code, status };
    });

    displayCards(allData);
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    
    if (data.length === 0) {
        container.innerHTML = "No data found.";
        return;
    }

    data.slice(0, 100).forEach(item => {
        const colorClass = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${colorClass}`;
        card.innerHTML = `
            <div class="badge">${item.code}</div>
            <div class="card-info">
                <h3>${item.place}</h3>
                <p>Enrolment: ${item.enrolment.toLocaleString()}</p>
                <p>Status: ${item.status}</p>
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
