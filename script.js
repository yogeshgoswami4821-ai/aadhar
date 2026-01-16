let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    // UI Feedback for Large Data
    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Streaming and Analyzing Hierarchical Data... Please wait.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        // High Timeout for Render Free Tier (120 seconds)
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 120000); 

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(id);
        const data = await res.json();
        
        if(data.error) throw new Error(data.error);

        allData = data.patterns;
        
        // Console log for debugging
        console.log(`Successfully analyzed ${allData.length} hierarchical regions.`);
        
        displayCards(allData);

    } catch (err) {
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large for free tier)" : "Server Busy or File Format Error";
        container.innerHTML = `<p style='color:red; font-weight:bold;'>⚠️ ${msg}. Tip: For live demo, try a 5 Lakh row sample for instant results.</p>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (data.length === 0) {
        container.innerHTML = "<p class='no-match'>No matching patterns found.</p>";
        return;
    }

    // UI Performance: Sirf top 500 results dikhayein browser hang na ho isliye
    const displayLimit = 500;
    const itemsToShow = data.slice(0, displayLimit);

    // Show result count info
    if (data.length > displayLimit) {
        const info = document.createElement("p");
        info.innerHTML = `<i>Showing top ${displayLimit} of ${data.length} hierarchical insights. Use search to filter.</i>`;
        info.style.color = "#64748b";
        info.style.marginBottom = "15px";
        container.appendChild(info);
    }

    itemsToShow.forEach(item => {
        // Color coding based on R, Y, G status
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

// Filter function for Real-time Monitoring
function filterData() {
    const query = document.getElementById("searchInput").value.toUpperCase();
    
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || 
        item.code.toUpperCase() === query
    );
    
    displayCards(filtered);
}
