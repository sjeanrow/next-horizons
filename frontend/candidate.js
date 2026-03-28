
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

async function loadMe() {
  const { res, data } = await api("/me");
  if (!res.ok) return;

  document.getElementById("first_name").value = data.first_name || "";
  document.getElementById("last_name").value = data.last_name || "";
  document.getElementById("phone").value = data.phone || "";
  document.getElementById("pronouns").value = data.pronouns || "";
  document.getElementById("job_type").value = data.job_type || "";
  document.getElementById("desired_titles").value = (data.desired_titles || []).join(", ");
  document.getElementById("desired_duties").value = (data.desired_duties || []).join(", ");
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    first_name: document.getElementById("first_name").value,
    last_name: document.getElementById("last_name").value,
    phone: document.getElementById("phone").value,
    pronouns: document.getElementById("pronouns").value,
    previous_names: document.getElementById("previous_names").value
      ? document.getElementById("previous_names").value.split(",").map(s => s.trim())
      : [],
    job_type: document.getElementById("job_type").value,
    desired_titles: document.getElementById("desired_titles").value
      ? document.getElementById("desired_titles").value.split(",").map(s => s.trim())
      : [],
    desired_duties: document.getElementById("desired_duties").value
      ? document.getElementById("desired_duties").value.split(",").map(s => s.trim())
      : []
  };

  const { res, data } = await api("/candidate/profile", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!res.ok) return alert(data.error || "Could not save profile");
  alert("Profile saved");
  loadMatches();
});

async function loadMatches() {
  const { res, data } = await api("/jobs/matches");
  const root = document.getElementById("matches");
  root.innerHTML = "";

  if (!res.ok) {
    root.innerHTML = `<p>${data.error || "Could not load jobs"}</p>`;
    return;
  }

  if (!data.length) {
    root.innerHTML = "<p>No matches yet. Try filling in your desired titles and duties.</p>";
    return;
  }

  data.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job";
    card.innerHTML = `
      <h3>${job.title}</h3>
      <p><strong>${job.company || "Employer"}</strong> · ${job.job_type || ""} · ${job.work_location || ""}</p>
      <p><strong>Match score:</strong> ${job.match_score}</p>
      <p><strong>Duties:</strong> ${(job.duties || []).join(", ")}</p>
      <button data-id="${job.id}">Apply now</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      const { res, data } = await api(`/jobs/${job.id}/apply`, { method: "POST" });
      if (!res.ok) return alert(data.error || "Could not apply");
      alert("Application submitted");
    });
    root.appendChild(card);
  });
}

loadMe();
loadMatches();
