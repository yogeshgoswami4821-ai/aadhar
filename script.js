let chart;

function uploadCSV() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload a CSV file");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  fetch("https://aadhar-o20a.onrender.com/upload", {
    method: "POST",
    body: formData
  })
  .then(res => {
    if (!res.ok) {
      throw new Error("Backend error");
    }
    return res.json();
  })
  .then(data => {
    drawChart(data.states, data.enrolments);
    showInsights(data.states, data.enrolments);
  })
  .catch(err => {
    alert("Backend not reachable or still waking up (wait 30–50 sec on free tier)");
    console.error(err);
  });
}

function drawChart(states, values) {
  const ctx = document.getElementById("enrolmentChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: states,
      datasets: [{
        label: "Aadhaar Enrolments",
        data: values,
        backgroundColor: values.map(v =>
          v < 30000 ? "#ef4444" :   // 🔴 Low
          v < 60000 ? "#facc15" :   // 🟡 Medium
          "#22c55e"                 // 🟢 Healthy
        )
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      }
    }
  });
}

function showInsights(states, values) {
  const list = document.getElementById("insightList");
  list.innerHTML = "";

  states.forEach((state, i) => {
    let msg = "";
    if (values[i] < 30000) {
      msg = `🔴 ${state}: Low enrolment – awareness campaign needed`;
    } else if (values[i] < 60000) {
      msg = `🟡 ${state}: Moderate enrolment – monitor closely`;
    } else {
      msg = `🟢 ${state}: Healthy enrolment – system stable`;
    }

    const li = document.createElement("li");
    li.textContent = msg;
    list.appendChild(li);
  });
}
