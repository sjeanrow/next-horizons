function token() { return localStorage.getItem("nh_token"); }
function getSitePassword() { return localStorage.getItem("nh_site_password") || ""; }
function logout() { localStorage.clear(); location.href = "index.html"; }

async function api(path, options = {}) {
  const res = await fetch(`${window.API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token()}`,
      "x-site-password": getSitePassword(),
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { res, data };
}

async function confirmAccess() {
  if (!getSitePassword()) {
    location.href = "index.html";
    return false;
  }

  const res = await fetch(`${window.API_URL}/beta/check`, {
    method: "POST",
    headers: { "x-site-password": getSitePassword() }
  });

  if (!res.ok) {
    localStorage.removeItem("nh_site_password");
    location.href = "index.html";
    return false;
  }

  return true;
}

function setTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("section[id$='Tab']").forEach((section) => section.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });
}

if (!token()) location.href = "index.html";
document.getElementById("logoutBtn").addEventListener("click", logout);
setTabs();

let employerJobs = [];
let employerApplications = [];
let currentApplicationFilter = "Needs Action";
let currentApplicationSearch = "";
let currentApplicationSort = "Newest";

function getEmployerTrustLabel(responseRate) {
  if (responseRate >= 80) return { label: "Fast Responder", tone: "good" };
  if (responseRate >= 40) return { label: "Needs Attention", tone: "warn" };
  return { label: "At Risk", tone: "bad" };
}

function updateEmployerSummary() {
  const jobsEl = document.getElementById("sumJobs");
  const applicantsEl = document.getElementById("sumApplicants");
  const pendingEl = document.getElementById("sumPending");
  const responseEl = document.getElementById("sumResponseRate");

  if (!jobsEl || !applicantsEl || !pendingEl || !responseEl) return;

  const activeJobs = employerJobs.length;
  const totalApplicants = employerApplications.length;
  const pendingResponses = employerApplications.filter(a => a.status === "Pending").length;
  const responded = employerApplications.filter(a => a.status !== "Pending").length;
  const responseRate = totalApplicants ? Math.round((responded / totalApplicants) * 100) : 0;

  const isProbation =
    employerApplications.length >= 4 &&
    employerApplications.filter(a => a.status !== "Pending").length / employerApplications.length < 0.5;

  const trust = getEmployerTrustLabel(responseRate);
  const trustEl = document.getElementById("sumTrustLabel");
  if (trustEl) trustEl.textContent = trust.label;

  jobsEl.textContent = activeJobs;
  applicantsEl.textContent = totalApplicants;
  pendingEl.textContent = pendingResponses;
  responseEl.textContent = `${responseRate}%`;

  const probationWarning = document.getElementById("probationWarning");
  if (probationWarning) {
    probationWarning.classList.toggle("hidden", !isProbation);
  }

  const postBtn = document.getElementById("postJobBtn");
  if (postBtn) {
    postBtn.disabled = isProbation;
    postBtn.textContent = isProbation ? "Posting disabled during review" : "Post job";
  }

  const reminderEl = document.getElementById("employerReminder");
  if (reminderEl) {
    reminderEl.classList.toggle("hidden", pendingResponses === 0);
    reminderEl.textContent =
      pendingResponses === 1
        ? "You have 1 application waiting for review."
        : `You have ${pendingResponses} applications waiting for review.`;
  }
}

async function loadJobs() {
  const { res, data } = await api("/employer/jobs");
  const root = document.getElementById("jobs");
  root.innerHTML = "";

  if (!res.ok) {
    root.innerHTML = `<p>${data.error || "Could not load jobs"}</p>`;
    return;
  }

  employerJobs = data;
  updateEmployerSummary();

  if (!data.length) {
    root.innerHTML = "<p>No jobs posted yet.</p>";
    return;
  }

  data.forEach(job => {
    const card = document.createElement("div");
    card.className = "job";
   card.innerHTML = `
  <h3>${job.title}</h3>
  <p><strong>${job.company || ""}</strong> · ${job.job_type || ""}</p>
  <div class="chip-wrap">${(job.duties || []).map(d => `<span class="pill">${d}</span>`).join("")}</div>
  <p><strong>Pay:</strong> ${job.pay_rate || ""}</p>
  <p><strong>Location:</strong> ${job.work_location || ""}</p>
  <button type="button" class="secondary small deleteJobBtn">Delete job</button>
`;
    const deleteBtn = card.querySelector(".deleteJobBtn");
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    const confirmed = confirm(`Delete the job posting "${job.title}"?`);
    if (!confirmed) return;

    const { res, data } = await api(`/employer/jobs/${job.id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert(data.error || "Could not delete job");
      return;
    }

    alert("Job deleted");
    loadJobs();
    loadApplications();
  });
}
    root.appendChild(card);
  });
}

async function loadApplications() {
  const { res, data } = await api("/employer/applications");
  const root = document.getElementById("applications");
  root.innerHTML = "";

  if (!res.ok) {
    root.innerHTML = `<p>${data.error || "Could not load applications"}</p>`;
    return;
  }

  employerApplications = data;
  updateEmployerSummary();

  if (!data.length) {
    root.innerHTML = "<p>No applications yet.</p>";
    return;
  }

let filtered =
  currentApplicationFilter === "All"
    ? data
    : currentApplicationFilter === "Needs Action"
      ? data.filter(app => app.status === "Pending" || app.status === "No Response")
      : data.filter(app => app.status === currentApplicationFilter);

if (currentApplicationSearch) {
  filtered = filtered.filter((app) => {
    const fullName = `${app.candidate?.first_name || ""} ${app.candidate?.last_name || ""}`.toLowerCase();
    const email = `${app.candidate?.email || ""}`.toLowerCase();

    return fullName.includes(currentApplicationSearch) || email.includes(currentApplicationSearch);
  });
}
if (currentApplicationSort === "Newest") {
  filtered.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
} else if (currentApplicationSort === "Oldest") {
  filtered.sort((a, b) => new Date(a.applied_at) - new Date(b.applied_at));
} else if (currentApplicationSort === "NameAZ") {
  filtered.sort((a, b) => {
    const nameA = `${a.candidate?.first_name || ""} ${a.candidate?.last_name || ""}`.trim().toLowerCase();
    const nameB = `${b.candidate?.first_name || ""} ${b.candidate?.last_name || ""}`.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });
} else if (currentApplicationSort === "NameZA") {
  filtered.sort((a, b) => {
    const nameA = `${a.candidate?.first_name || ""} ${a.candidate?.last_name || ""}`.trim().toLowerCase();
    const nameB = `${b.candidate?.first_name || ""} ${b.candidate?.last_name || ""}`.trim().toLowerCase();
    return nameB.localeCompare(nameA);
  });
}
if (!filtered.length) {
  if (currentApplicationSearch) {
    root.innerHTML = "<p>No applicants match that search.</p>";
  } else if (currentApplicationFilter === "Needs Action") {
    root.innerHTML = "<p>No applications currently need action.</p>";
  } else {
    root.innerHTML = `<p>No ${currentApplicationFilter.toLowerCase()} applications found.</p>`;
  }
  return;
}

  filtered.forEach(app => {
    const card = document.createElement("div");
    card.className = "job";

    card.innerHTML = `
      <h3>${app.job?.title || "Job"}</h3>
      <p><strong>${app.candidate?.first_name || ""} ${app.candidate?.last_name || ""}</strong> · ${app.candidate?.email || ""}</p>
      <p>Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
      <div class="row">
        <span class="pill badge-${app.status}">${app.status}</span>
        <select class="statusSelect">
          <option value="Pending" ${app.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Interviewing" ${app.status === "Interviewing" ? "selected" : ""}>Interviewing</option>
          <option value="Denied" ${app.status === "Denied" ? "selected" : ""}>Denied</option>
          <option value="Offered" ${app.status === "Offered" ? "selected" : ""}>Offered</option>
          <option value="Accepted" ${app.status === "Accepted" ? "selected" : ""}>Accepted</option>
          <option value="No Response" ${app.status === "No Response" ? "selected" : ""}>No Response</option>
        </select>
      </div>
      <button type="button" class="secondary small">Update status</button>
    `;

    const select = card.querySelector(".statusSelect");
    const button = card.querySelector("button");

    button.addEventListener("click", async () => {
      const newStatus = select.value;

      const { res, data } = await api(`/employer/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        alert(data.error || "Could not update status");
        return;
      }

      alert(`Status updated to ${newStatus}`);
      await loadApplications();
    });

    root.appendChild(card);
  });
}

const filterEl = document.getElementById("applicationFilter");
if (filterEl) {
  filterEl.addEventListener("change", (e) => {
    currentApplicationFilter = e.target.value;
    loadApplications();
  });
}
const searchEl = document.getElementById("applicationSearch");
if (searchEl) {
  searchEl.addEventListener("input", (e) => {
    currentApplicationSearch = e.target.value.toLowerCase().trim();
    loadApplications();
  });
}
const sortEl = document.getElementById("applicationSort");
if (sortEl) {
  sortEl.addEventListener("change", (e) => {
    currentApplicationSort = e.target.value;
    loadApplications();
  });
}

(async () => {
  const ok = await confirmAccess();
  if (!ok) return;

  loadJobs();
  loadApplications();
})();
