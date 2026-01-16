let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    
    container.innerHTML = `
        <div class='loader'>
            <p>🔄 Crunching Data via Chunks...</p>
            <small>Processing 10 Lakh+ records might take up to 60 seconds on Free Tier.</small>
        </div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        // Timeout control: 120 seconds wait karega
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
        if (err.name === 'AbortError') {
            container.innerHTML = "<p style='color:red'>⚠️ Server took too long (Timeout). Try with 5 Lakh rows or a better connection.</p>";
        } else {
            container.innerHTML = `
                <div style='color:#ef4444; padding:20px; border:1px solid #ef4444; border-radius:8px;'>
                    <strong>Error:</strong> ${err.message}<br>
                    <small>Try refreshing the page or using a smaller sample file.</small>
                </div>`;
        }
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (data.length === 0) {
        container.innerHTML = "<p class='no-match'>No matching regions found.</p>";
        return;
    }

    // Optimization: Top 500 records only for smooth UI
    const displayLimit = 500;
    const itemsToShow = data.slice(0, displayLimit);

    if (data.length > displayLimit) {
        const info = document.createElement("p");
        info.innerHTML = `<i>Showing top ${displayLimit} of ${data.length} hierarchical patterns.</i>`;
        info.style.color = "#64748b";
        container.appendChild(info);
    }

    itemsToShow.forEach(item => {
        const colorClass = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${colorClass}`;
        card.innerHTML = `
            <div class="badge">${item.code}</div>
            <div class="card-info">
                <h3>${item.place}</h3>
                <p><strong>Total Enrolment:</strong> ${item.enrolment.toLocaleString()}</p>
                <p><strong>Status Code Analysis:</strong> ${item.analysis}</p>
            </div>
        `;
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
