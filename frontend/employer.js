
const token = localStorage.getItem("nh_token");
if (!token) location.href = "index.html";

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  location.href = "index.html";
});

async function api(path, options = {}) {
  const res = await fetch(`${window.API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  return { res, data: await res.json() };
}

document.getElementById("jobForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    company: document.getElementById("company").value,
    title: document.getElementById("title").value,
    duties: document.getElementById("duties").value.split(",").map(s => s.trim()).filter(Boolean),
    education_req: document.getElementById("education_req").value.split(",").map(s => s.trim()).filter(Boolean),
    experience_req: document.getElementById("experience_req").value.split(",").map(s => s.trim()).filter(Boolean),
    work_location: document.getElementById("work_location").value,
    remote_scope: document.getElementById("remote_scope").value,
    timezone_hiring_for: document.getElementById("timezone_hiring_for").value,
    timezone_hiring_from: document.getElementById("timezone_hiring_from").value,
    days_shifts: document.getElementById("days_shifts").value.split(",").map(s => s.trim()).filter(Boolean),
    pay_rate: document.getElementById("pay_rate").value,
    job_type: document.getElementById("job_type").value
  };

  const { res, data } = await api("/employer/jobs", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!res.ok) return alert(data.error || "Could not post job");
  alert("Job posted");
  e.target.reset();
  loadJobs();
});

async function loadJobs() {
  const { res, data } = await api("/employer/jobs");
  const root = document.getElementById("jobs");
  root.innerHTML = "";

  if (!res.ok) {
    root.innerHTML = `<p>${data.error || "Could not load jobs"}</p>`;
    return;
  }

  if (!data.length) {
    root.innerHTML = "<p>No jobs posted yet.</p>";
    return;
  }

  data.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job";
    card.innerHTML = `
      <h3>${job.title}</h3>
      <p><strong>${job.company || ""}</strong> · ${job.job_type || ""}</p>
      <p><strong>Location:</strong> ${job.work_location || ""}</p>
      <p><strong>Pay:</strong> ${job.pay_rate || ""}</p>
      <p><strong>Duties:</strong> ${(job.duties || []).join(", ")}</p>
    `;
    root.appendChild(card);
  });
}

loadJobs();
