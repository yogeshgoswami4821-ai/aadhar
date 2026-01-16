let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    btn.innerText = "⚡ Processing Large Data...";
    btn.disabled = true; // Double click prevent karne ke liye
    
    container.innerHTML = `
        <div class='loader'>
            <p>🔄 Crunching 1 Million+ Rows...</p>
            <small>This may take 10-20 seconds on Free Tier server.</small>
        </div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Server Timeout or File Error");

        const data = await res.json();
        
        if(data.error) throw new Error(data.error);

        allData = data.patterns;
        
        // Show success alert with total count
        console.log(`Successfully analyzed ${data.summary.total_regions} regions.`);
        
        displayCards(allData);
    } catch (err) {
        container.innerHTML = `
            <div style='color:#ef4444; padding:20px; border:1px solid #ef4444; border-radius:8px;'>
                <strong>Error:</strong> ${err.message}<br>
                <small>Tip: If using 10L+ rows, try a slightly smaller file or wait 1 minute for server to reset.</small>
            </div>`;
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

    // OPTIMIZATION: Agar data 500 se zyada hai, toh sirf top 500 dikhayein 
    // taaki browser hang na ho. Search karne par baaki mil jayenge.
    const displayLimit = 500;
    const itemsToShow = data.slice(0, displayLimit);

    if (data.length > displayLimit) {
        const info = document.createElement("p");
        info.innerHTML = `<i>Showing top ${displayLimit} of ${data.length} results. Use search to find specific areas.</i>`;
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
                <p><strong>Enrolment:</strong> ${item.enrolment.toLocaleString()}</p>
                <p><strong>Insight:</strong> ${item.analysis}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterData() {
    const query = document.getElementById("searchInput").value.toUpperCase();
    
    // Fast filtering logic
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || 
        item.code.toUpperCase() === query
    );
    
    displayCards(filtered);
}
