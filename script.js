let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Pehle file select karein!");

    // Loading State
    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Analyzing Hierarchical Data... (Wait for 30-60s)</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(id);
        const data = await res.json();
        
        if(data.error) throw new Error(data.error);

        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large)" : "Server Busy or File Error";
        container.innerHTML = `<p style='color:red; font-weight:bold;'>⚠️ ${msg}. Tip: Demo ke liye 5 Lakh rows wali file best hai.</p>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No data to display.</p>";
        return;
    }

    // Performance Optimization: Only show top 300 cards
    data.slice(0, 300).forEach(item => {
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
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || 
        item.code.toUpperCase() === query
    );
    displayCards(filtered);
}
