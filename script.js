let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Analyzing Hierarchical Data... This can take up to 60s.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 120000); // 120 Seconds Timeout

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
        container.innerHTML = `<p style='color:red; font-weight:bold;'>⚠️ ${msg}. Tip: For live demo, use 5 Lakh rows for instant results.</p>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No results found.</p>";
        return;
    }

    // Performance Hack: Only show top 500 to keep browser fast
    data.slice(0, 500).forEach(item => {
        const colorClass = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${colorClass}`;
        card.innerHTML = `
            <div class="badge">${item.code}</div>
            <div class="card-info">
                <h3>${item.place}</h3>
                <p><strong>Enrolment:</strong> ${item.enrolment.toLocaleString()}</p>
                <p><strong>Insight:</strong> ${item.analysis}</p>
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
