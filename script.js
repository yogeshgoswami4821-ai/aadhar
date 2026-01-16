let allData = [];

// Step 1: File Upload and Backend Analysis
async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    // Check if file is selected
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    // UI State: Loading
    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Analyzing Hierarchical Data... This can take up to 60s for 10L rows.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        // High Timeout for Render Free Tier (120 seconds)
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 120000); 

        // Fetching from Render Backend
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(id);
        const data = await res.json();
        
        // Error handling for backend failure
        if(data.error) throw new Error(data.error);

        // Store globally for real-time search
        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        // Dynamic error messaging based on failure type
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large for free tier)" : "Server Busy or File Error";
        container.innerHTML = `<p style='color:red; font-weight:bold;'>⚠️ ${msg}. Tip: For live demo, use 5 Lakh rows for instant results.</p>`;
        console.error("Analysis Error:", err);
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

// Step 2: UI Rendering with Performance Optimization
function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (!data || data.length === 0) {
        container.innerHTML = "<p class='no-match'>No hierarchical patterns found. Check CSV format.</p>";
        return;
    }

    // Performance Hack: Only show top 500 to keep browser fast with 1M+ data
    const displayLimit = 500;
    const itemsToShow = data.slice(0, displayLimit);

    // Show result count info
    if (data.length > displayLimit) {
        const info = document.createElement("p");
        info.innerHTML = `<i>Showing top ${displayLimit} of ${data.length} results. Use Search to find specific areas.</i>`;
        info.style.color = "#64748b";
        info.style.padding = "10px";
        container.appendChild(info);
    }

    itemsToShow.forEach(item => {
        // R-Y-G Color Coding based on Backend Logic
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

// Step 3: Real-time Filtering Logic
function filterData() {
    const searchInput = document.getElementById("searchInput");
    if(!searchInput) return;

    const query = searchInput.value.toUpperCase();
    
    // Filtering global allData array
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || 
        item.code.toUpperCase() === query
    );
    
    displayCards(filtered);
}
