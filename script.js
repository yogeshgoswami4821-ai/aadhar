let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a file!");

    btn.innerText = "⚡ Processing...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Analyzing... Wait 30-60s for large files.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); 

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();
        
        if(data.error) throw new Error(data.error);

        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        let msg = err.name === 'AbortError' ? "Timeout (Large Data)" : "Server Error";
        container.innerHTML = `<p style='color:red;'>⚠️ ${msg}. Tip: Try a smaller file for instant demo.</p>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 
    
    // Performance: Only show top 400 cards to avoid browser lag
    data.slice(0, 400).forEach(item => {
        const color = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${color}`;
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
    const filtered = allData.filter(i => i.place.toUpperCase().includes(query) || i.code === query);
    displayCards(filtered);
}
