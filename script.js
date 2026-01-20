let allData = [];
let charts = {};

function initDashboard() {
    const config = (type, color) => ({
        type: type,
        data: { labels: [], datasets: [{ data: [], backgroundColor: color, borderColor: color, tension: 0.4, fill: true, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (type === 'doughnut') } } }
    });
    charts.main = new Chart(document.getElementById('enrolmentChart'), config('bar', '#ef4444'));
    charts.comparison = new Chart(document.getElementById('comparisonChart'), config('doughnut', ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981']));
    charts.top1 = new Chart(document.getElementById('topChart1'), config('line', '#3b82f6'));
    charts.top2 = new Chart(document.getElementById('topChart2'), config('line', '#8b5cf6'));
}

// --- Dadra/Daman hataane aur spelling theek karne ka logic ---
function getCleanState(name) {
    if (!name) return null;
    let s = name.toString().toUpperCase().trim();

    // 1. Inhe list se poori tarah nikaal do
    if (s.includes("DADRA") || s.includes("DAMAN") || s.includes("NAGAR HAVELI") || s.includes("DARBHANGA") || s.includes("AGE_") || s.includes("100000")) {
        return null;
    }

    // 2. Spelling merge (Taki West Bengal 4 baar na dikhe)
    if (s.includes("BENG") || s.includes("BANGAL")) return "West Bengal";
    if (s.includes("CHHATTIS")) return "Chhattisgarh";
    if (s.includes("JAMMU")) return "Jammu & Kashmir";
    if (s.includes("PUDU") || s.includes("PONDI")) return "Puducherry";
    if (s.includes("ANDAMAN")) return "Andaman & Nicobar Islands";
    if (s.includes("UTTARANCHAL")) return "Uttarakhand";

    // Baaki sabko sundar format mein badlo
    return s.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

async function uploadCSV() {
    const files = document.getElementById("fileInput").files;
    if (!files.length) return alert("Bhai, pehle file toh select karo!");
    
    let rows = [];
    for (let f of files) {
        const text = await f.text();
        const res = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        rows = rows.concat(res.data);
    }
    parseData(rows);
}

function parseData(rows) {
    allData = [];
    let dates = new Set();

    rows.forEach((row, i) => {
        if (row.length < 3) return;

        // Smart Column Detection
        let dateVal = row.find(v => v && (v.includes('/') || v.includes('-')) && v.length > 5);
        if (!dateVal) return;

        // Text columns ko filter karo (jo number nahi hain)
        let textCols = row.filter(v => v && isNaN(v) && v.length > 2);
        let stateName = textCols[1]; // Maan ke chal rahe hain 2nd text column state hai
        let distName = textCols[2] || textCols[1];

        let stateClean = getCleanState(stateName);
        
        // Sabse bada number dhundo row mein
        let numbers = row.map(v => parseInt(v.toString().replace(/[^0-9]/g, ''))).filter(n => !isNaN(n));
        let maxVal = numbers.length > 0 ? Math.max(...numbers) : 0;

        if (stateClean && maxVal > 0) {
            allData.push({
                date: dateVal.trim(),
                state: stateClean,
                dist: distName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                val: maxVal
            });
            dates.add(dateVal.trim());
        }
    });

    if (allData.length === 0) {
        alert("Data load nahi ho paya! Check karein ki CSV mein numbers aur states sahi hain.");
    }

    populateDateDropdown([...dates]);
    populateStateList();
    applyFilters();
}

function populateStateList() {
    const states = [...new Set(allData.map(d => d.state))].sort();
    document.getElementById('stateList').innerHTML = states.map(s => `
        <div class="multi-select-item">
            <input type="checkbox" class="state-check" value="${s}" onchange="updateDistrictList()"> ${s}
        </div>
    `).join('');
}

function updateDistrictList() {
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const container = document.getElementById('distList');
    const districts = [...new Set(allData.filter(d => !selStates.length || selStates.includes(d.state)).map(d => d.dist))].sort();
    
    container.innerHTML = districts.map(d => `
        <div class="multi-select-item">
            <input type="checkbox" class="dist-check" value="${d}" onchange="applyFilters()"> ${d}
        </div>
    `).join('');
    applyFilters();
}

function applyFilters() {
    const selDate = document.getElementById('dateSelect').value;
    const selStates = Array.from(document.querySelectorAll('.state-check:checked')).map(i => i.value);
    const selDists = Array.from(document.querySelectorAll('.dist-check:checked')).map(i => i.value);

    let filtered = allData;
    if (selDate) filtered = filtered.filter(d => d.date === selDate);
    if (selStates.length > 0) filtered = filtered.filter(d => selStates.includes(d.state));
    if (selDists.length > 0) filtered = filtered.filter(d => selDists.includes(d.dist));

    // Deduplication logic
    let grouped = {};
    filtered.forEach(item => {
        let key = item.dist + "|" + item.state;
        if (!grouped[key]) grouped[key] = { ...item };
        else grouped[key].val = Math.max(grouped[key].val, item.val);
    });

    let finalData = Object.values(grouped).sort((a, b) => b.val - a.val);
    updateCharts(finalData);
    displayCards(finalData);
}

function updateCharts(data) {
    const top = data.slice(0, 10);
    
    // Main Chart Update
    charts.main.data.labels = top.map(d => d.dist);
    charts.main.data.datasets[0].data = top.map(d => d.val);
    charts.main.update();

    // Comparison Chart Update
    charts.comparison.data.labels = top.slice(0, 5).map(d => d.dist);
    charts.comparison.data.datasets[0].data = top.slice(0, 5).map(d => d.val);
    charts.comparison.update();

    // Stats Display
    document.getElementById('totalCountDisplay').innerText = `${data.length} Regions Active`;
}

function populateDateDropdown(dates) {
    document.getElementById('dateSelect').innerHTML = '<option value="">All Dates</option>' + 
        dates.sort().map(d => `<option value="${d}">${d}</option>`).join('');
}

function displayCards(data) {
    document.getElementById("resultContainer").innerHTML = data.slice(0, 50).map(d => `
        <div class="status-card">
            <div><strong>${d.dist}</strong> <br> <small>${d.state}</small></div>
            <div style="color:#2563eb; font-weight:bold">${d.val.toLocaleString()}</div>
        </div>
    `).join('');
}

window.onload = initDashboard;
