let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    container.innerHTML = "";
    if (!fileInput.files[0]) return alert("Please select a file!");

    btn.innerText = "⚡ Processing Million Rows...";
    btn.disabled = true;
    
    // Naya Warning/Status Loader
    container.innerHTML = `
        <div style="padding: 20px; background: #e3f2fd; border-left: 5px solid #2196f3; margin: 20px 0;">
            <p>🔄 <b>Analyzing Aadhaar Hierarchy...</b></p>
            <p style="font-size: 0.85em;">Note: 10 Lakh rows can take 60-90 seconds on Free Tier. Please don't refresh.</p>
        </div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        // Timeout badha kar 5 minute kar diya hai demo ke liye
        const timeoutId = setTimeout(() => controller.abort(), 300000); 

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (!res.ok || data.error) {
            container.innerHTML = `
                <div style="background: #fff5f5; border: 2px solid #ff4d4d; padding: 20px; border-radius: 8px; color: #cc0000;">
                    <h3>⚠️ SYSTEM WARNING</h3>
                    <p>${data.error || "File size too large for free server."}</p>
                    <p><b>Quick Fix:</b> Try a file with 1-5 Lakh rows for instant demo.</p>
                </div>`;
            return;
        }

        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too heavy)" : "Connection Lost";
        container.innerHTML = `
            <div style="background: #fff9db; border: 2px solid #fcc419; padding: 20px; border-radius: 8px; color: #856404;">
                <p>⚠️ <b>${msg}</b></p>
                <p>Render's Free Tier has limited RAM. For a smooth demo, please use a file with fewer rows.</p>
            </div>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 
    
    // Performance: Only show top 300 cards
    data.slice(0, 300).forEach(item => {
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
