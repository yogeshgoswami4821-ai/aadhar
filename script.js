let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    container.innerHTML = "";
    
    if (!fileInput.files || !fileInput.files[0]) {
        alert("Please select a CSV file first!");
        return;
    }

    btn.innerText = "⚡ Analyzing...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Processing Data... Please wait up to 90s for large files.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); 

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (!res.ok || data.error) {
            container.innerHTML = `
                <div style="background: #fff5f5; border: 2px solid #ff4d4d; padding: 15px; border-radius: 8px; color: #cc0000; margin-top: 20px;">
                    <h3 style="margin: 0 0 10px 0;">⚠️ SYSTEM WARNING</h3>
                    <p>${data.error || "Analysis Failed"}</p>
                    <small>Correct Format: State, District, Tehsil, Enrolment</small>
                </div>`;
            return;
        }

        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large)" : "Backend Connection Failed";
        container.innerHTML = `
            <div style="background: #fff9db; border: 2px solid #fcc419; padding: 15px; border-radius: 8px; color: #856404; margin-top: 20px;">
                <p>⚠️ <b>${msg}</b></p>
            </div>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No hierarchical patterns found.</p>";
        return;
    }

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
    const filtered = allData.filter(i => 
        i.place.toUpperCase().includes(query) || 
        i.code.toUpperCase() === query
    );
    displayCards(filtered);
}
