let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV file!");

    btn.innerText = "⚡ Processing 1 Million+ Rows...";
    btn.disabled = true;
    container.innerHTML = `<div class='loader'>🔄 Streaming and Analyzing Hierarchical Data...</div>`;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 120000); // 2 Minute Timeout

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
        let msg = err.name === 'AbortError' ? "Server Timeout (Data too large)" : "Server Busy or File Format Error";
        container.innerHTML = `<p style='color:red; font-weight:bold;'>⚠️ ${msg}. Please try a 5 Lakh row sample for the live demo.</p>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; 

    // UI Performance: Sirf top 500 results dikhayein browser hang na ho isliye
    const displayLimit = 500;
    data.slice(0, displayLimit).forEach(item => {
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
