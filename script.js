let allData = [];

// Step 1: File Upload and Analysis with Warning System
async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    // Previous results aur warnings saaf karein
    container.innerHTML = "";
    
    if (!fileInput.files[0]) {
        alert("Please select a CSV file first!");
        return;
    }

    // UI State: Loading
    btn.innerText = "⚡ Analyzing Hierarchical Data...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Processing 1 Million+ Rows... This can take up to 60s.</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s Timeout

        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();
        
        // Step 2: Warning Logic - Agar backend error bhejta hai
        if (!res.ok || data.error) {
            container.innerHTML = `
                <div style="background: #fff5f5; border: 2px solid #ff4d4d; padding: 20px; border-radius: 8px; color: #cc0000; text-align: center; margin-top: 20px;">
                    <h3 style="margin-top: 0;">⚠️ SYSTEM WARNING</h3>
                    <p><b>Issue:</b> ${data.error || "Server Busy or Analysis Failed"}</p>
                    <p style="font-size: 0.9em; color: #666;">Tip: Ensure CSV has columns: <b>State, District, Tehsil, Enrolment</b></p>
                </div>`;
            return;
        }

        // Global data update for real-time search
        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        // Step 3: Connection or Timeout Warnings
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large)" : "Backend Connection Failed";
        container.innerHTML = `
            <div style="background: #fff9db; border: 2px solid #fcc419; padding: 15px; border-radius: 8px; color: #856404; text-align: center;">
                <p>⚠️ <b>${msg}</b></p>
                <p>Tip: Check Render logs or try a smaller sample file (e.g., 5 Lakh rows).</p>
            </div>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

// Step 4: Optimized UI Rendering
function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    if (!data || data.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#666;'>No hierarchical patterns found in this file.</p>";
        return;
    }

    // Performance Hack: Browser lag se bachne ke liye top 400 cards
    data.slice(0, 400).forEach(item => {
        // R-Y-G Color Coding
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

// Step 5: Real-time Search Filter
function filterData() {
    const query = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(i => 
        i.place.toUpperCase().includes(query) || 
        i.code.toUpperCase() === query
    );
    displayCards(filtered);
}
