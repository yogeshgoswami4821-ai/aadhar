let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    
    if (!fileInput.files[0]) return alert("Please select a CSV!");

    btn.innerText = "Analyzing...";
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        allData = data.patterns;
        displayCards(allData);
    } catch (err) {
        alert("Server wake-up in progress. Try again in 30 seconds.");
    } finally {
        btn.innerText = "Analyze Hierarchy";
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";

    data.forEach(item => {
        const card = document.createElement("div");
        const colorClass = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        
        card.className = `status-card ${colorClass}`;
        card.innerHTML = `
            <div class="badge">${item.code}</div>
            <h3>${item.place}</h3>
            <p><strong>Enrolment:</strong> ${item.enrolment}</p>
            <p><strong>Analysis:</strong> ${item.analysis}</p>
        `;
        container.appendChild(card);
    });
}

function filterData() {
    const query = document.getElementById("searchInput").value.toUpperCase();
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || item.code.toUpperCase() === query
    );
    displayCards(filtered);
}
