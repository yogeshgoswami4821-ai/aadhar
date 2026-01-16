let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    const container = document.getElementById("resultContainer");
    
    if (!fileInput.files[0]) return alert("Please select a CSV!");

    btn.innerText = "Analyzing...";
    // Container mein loading state dikhayein
    container.innerHTML = "<div class='loader'>Processing Hierarchical Data...</div>";

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        
        if(data.error) throw new Error(data.error);

        allData = data.patterns;
        displayCards(allData);
    } catch (err) {
        container.innerHTML = "<p style='color:red'>Server busy or error. Please try again in 1 minute.</p>";
        btn.innerText = "Analyze Hierarchy";
    } finally {
        btn.innerText = "Analyze Hierarchy";
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = ""; // Purana content saaf karein

    if (data.length === 0) {
        container.innerHTML = "<p>No matches found.</p>";
        return;
    }

    data.forEach(item => {
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
    const filtered = allData.filter(item => 
        item.place.toUpperCase().includes(query) || item.code.toUpperCase() === query
    );
    displayCards(filtered);
}
