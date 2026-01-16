let chart;

async function uploadCSV() {
    const fileInput = document.getElementById("fileInput");
    const btn = document.getElementById("uploadBtn");
    
    if (!fileInput.files[0]) return alert("Please select a file!");

    btn.innerText = "Processing...";
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        // Updated URL to your new active backend
        const res = await fetch("https://aadhar-o9nr.onrender.com/upload", {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Backend error");

        const data = await res.json();
        
        document.getElementById("statsGrid").style.display = "grid";
        document.getElementById("totalStat").innerText = data.summary.total_enrolment.toLocaleString();
        document.getElementById("avgStat").innerText = data.summary.avg_by_state.toLocaleString();

        drawChart(data.states, data.enrolments);
        processTrends(data);
    } catch (err) {
        alert("Server is waking up. Please wait 30 seconds and try again.");
        console.error(err);
    } finally {
        btn.innerText = "Analyze Trends";
    }
}

function drawChart(labels, values) {
    const ctx = document.getElementById("enrolmentChart").getContext("2d");
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Enrolment Count",
                data: values,
                backgroundColor: values.map(v => v > 50000 ? "#22c55e" : "#ef4444"),
                borderRadius: 5
            }]
        }
    });
}

function processTrends(data) {
    const list = document.getElementById("insightList");
    list.innerHTML = "";

    data.states.forEach((state, i) => {
        if (data.enrolments[i] < data.summary.avg_by_state * 0.5) {
            addInsight(list, `Critical: ${state} saturation is very low.`, "red");
        }
    });

    for (let state in data.female_ratio) {
        if (data.female_ratio[state] < 0.45) {
            addInsight(list, `Gender Gap: Female enrolment is low in ${state}.`, "yellow");
        }
    }

    data.migration_hotspots.forEach(state => {
        addInsight(list, `Migration: High address updates in ${state}.`, "blue");
    });
}

function addInsight(target, text, type) {
    const li = document.createElement("li");
    li.className = `insight-item ${type}`;
    li.innerText = text;
    target.appendChild(li);
}
