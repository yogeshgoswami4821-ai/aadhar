let allData = [];

function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput || !fileInput.files[0]) {
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
        }
    });
}

function processData(data) {
    const container = document.getElementById("resultContainer");
    if (!data || data.length === 0) return;

    const keys = Object.keys(data[0]);
    
    // Sabse important fix: Kisi bhi tarah ki spelling ko accept karo
    const findKey = (list) => keys.find(k => list.some(name => k.toLowerCase().trim().includes(name.toLowerCase())));

    const sKey = findKey(["state", "st"]);
    const dKey = findKey(["district", "dist"]);
    
    // Enrolment ke liye multiple variations
    const eKey = findKey(["enrol", "enroll", "count", "total", "number", "qty"]);
    
    const tKey = findKey(["tehsil", "sub-dist", "taluka", "block"]);

    // Agar abhi bhi enrolment nahi mil raha, toh first column jisme numbers hon usse uthao
    let finalEnrolKey = eKey;
    if (!finalEnrolKey) {
        finalEnrolKey = keys.find(k => !isNaN(parseFloat(data[0][k])) && isFinite(data[0][k]));
    }

    if (!sKey || !dKey || !finalEnrolKey) {
        container.innerHTML = `<div style="color:red; border:2px solid red; padding:15px; background:#fff5f5;">
            <h3>⚠️ CSV HEADER ERROR</h3>
            <p>Could not find 'Enrolment' or 'State' columns.</p>
            <p>Please check your CSV file headers.</p>
        </div>`;
        return;
    }

    let summary = {};
    data.forEach(row => {
        let path = tKey ? `${row[sKey]} > ${row[dKey]} > ${row[tKey]}` : `${row[sKey]} > ${row[dKey]}`;
        let val = parseInt(row[finalEnrolKey]) || 0;
        summary[path] = (summary[path] || 0) + val;
    });

    const entries = Object.entries(summary);
    const avg = entries.length > 0 ? (entries.reduce((a, b) => a + b[1], 0) / entries.length) : 0;

    allData = entries.map(([place, val]) => {
        let code = val < (avg * 0.5) ? "R" : (val < avg ? "Y" : "G");
        return { place, enrolment: val, code };
    });

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
