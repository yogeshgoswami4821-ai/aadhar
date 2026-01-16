let allData = [];

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const container = document.getElementById("resultContainer");
    const btn = document.getElementById("uploadBtn");

    if (!fileInput.files[0]) return alert("Select a file!");

    btn.innerText = "⚡ Processing...";
    btn.disabled = true;
    container.innerHTML = "🔄 Analyzing Data (Limited to first 1L rows for speed)...";

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        
        if (data.error) {
            container.innerHTML = `<div style="color:red; border:1px solid red; padding:10px;">⚠️ ${data.error}</div>`;
            return;
        }

        allData = data.patterns;
        displayCards(allData);

    } catch (err) {
        //
        container.innerHTML = `<div style="color:orange; padding:10px;">⚠️ Backend Connection Failed. Check if Render is 'Live'.</div>`;
    } finally {
        btn.innerText = "Analyze Hierarchy";
        btn.disabled = false;
    }
}

function displayCards(data) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = "No patterns found.";
        return;
    }
    data.slice(0, 200).forEach(item => {
        const color = item.code === "R" ? "red-card" : (item.code === "Y" ? "yellow-card" : "green-card");
        const card = document.createElement("div");
        card.className = `status-card ${color}`;
        card.innerHTML = `<h3>${item.place}</h3><p>Enrolment: ${item.enrolment.toLocaleString()}</p><p>Status: ${item.analysis}</p>`;
        container.appendChild(card);
    });
}
