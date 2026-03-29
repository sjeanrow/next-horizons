
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

const degrees = ["Associate", "Bachelor", "Master", "Doctorate", "Certificate", "Diploma"];

let desiredTitles = [];
let desiredDuties = [];
let languages = [];
let certificates = [];
let military = [];
let experiences = [];
let education = [];
let previousNames = [];

function renderChips(root, values, onRemove) {
  root.innerHTML = "";
  values.forEach((value, index) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${value}</span><button type="button">×</button>`;
    chip.querySelector("button").addEventListener("click", () => onRemove(index));
    root.appendChild(chip);
  });
}
function addChipValue(inputId, arr, renderFn) {
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  if (!value) return;
  arr.push(value);
  input.value = "";
  renderFn();
}

function renderDesiredTitles() {
  renderChips(document.getElementById("desired_titles_chips"), desiredTitles, (i) => { desiredTitles.splice(i,1); renderDesiredTitles(); });
}
function renderDesiredDuties() {
  renderChips(document.getElementById("desired_duties_chips"), desiredDuties, (i) => { desiredDuties.splice(i,1); renderDesiredDuties(); });
}
function renderLanguages() {
  renderChips(document.getElementById("languageChips"), languages, (i) => { languages.splice(i,1); renderLanguages(); });
}
function renderCertificates() {
  renderChips(document.getElementById("certificateChips"), certificates, (i) => { certificates.splice(i,1); renderCertificates(); });
}
function renderMilitary() {
  renderChips(document.getElementById("militaryChips"), military, (i) => { military.splice(i,1); renderMilitary(); });
}

function renderPreviousNames() {
  const root = document.getElementById("previousNamesList");
  root.innerHTML = "";

  previousNames.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML = `
      <div class="section-title">
        <h4>Previous legal name ${index + 1}</h4>
        <button type="button" class="secondary small">Remove</button>
      </div>
      <input placeholder="Previous legal name" value="${name || ""}" />
    `;

    const input = row.querySelector("input");
    input.addEventListener("input", (e) => {
      previousNames[index] = e.target.value;
    });

    row.querySelector("button").addEventListener("click", () => {
      previousNames.splice(index, 1);
      renderPreviousNames();
    });

    root.appendChild(row);
  });
}

function expTemplate(item, idx) {
  const el = document.createElement("div");
  el.className = "entry";
  el.innerHTML = `
    <div class="section-title"><h4>Experience ${idx + 1}</h4><button type="button" class="secondary small">Remove</button></div>
    <div class="row">
      <input placeholder="Job title" value="${item.job_title || ""}" data-key="job_title" />
      <input placeholder="Company" value="${item.company || ""}" data-key="company" />
    </div>
    <div class="row four">
      <input placeholder="Start month" value="${item.start_month || ""}" data-key="start_month" />
      <input placeholder="Start year" value="${item.start_year || ""}" data-key="start_year" />
      <input placeholder="End month" value="${item.end_month || ""}" data-key="end_month" />
      <input placeholder="End year" value="${item.end_year || ""}" data-key="end_year" />
    </div>
    <input placeholder="Add duty" data-duty-input />
    <button type="button" class="secondary small" data-add-duty>Add duty</button>
    <div class="chip-wrap" data-duty-chips></div>
  `;
  el.querySelector(".section-title button").addEventListener("click", () => {
    experiences.splice(idx, 1);
    renderExperiences();
  });
  el.querySelectorAll("input[data-key]").forEach((input) => {
    input.addEventListener("input", () => {
      experiences[idx][input.dataset.key] = input.value;
    });
  });
  experiences[idx].duties = experiences[idx].duties || [];
  const dutyInput = el.querySelector("[data-duty-input]");
  const dutyRoot = el.querySelector("[data-duty-chips]");
  const draw = () => renderChips(dutyRoot, experiences[idx].duties, (i) => {
    experiences[idx].duties.splice(i, 1);
    draw();
  });
  el.querySelector("[data-add-duty]").addEventListener("click", () => {
    const value = dutyInput.value.trim();
    if (!value) return;
    experiences[idx].duties.push(value);
    dutyInput.value = "";
    draw();
  });
  draw();
  return el;
}

function renderExperiences() {
  const root = document.getElementById("experienceList");
  root.innerHTML = "";
  experiences.forEach((item, idx) => root.appendChild(expTemplate(item, idx)));
}

function eduTemplate(item, idx) {
  const el = document.createElement("div");
  el.className = "entry";
  el.innerHTML = `
    <div class="section-title"><h4>Education ${idx + 1}</h4><button type="button" class="secondary small">Remove</button></div>
    <div class="row">
      <input placeholder="College name" value="${item.college_name || ""}" data-key="college_name" />
      <input placeholder="Years attended" value="${item.years_attended || ""}" data-key="years_attended" />
    </div>
    <div class="row">
      <select data-key="degree">
        <option value="">Degree</option>
        ${degrees.map((d) => `<option ${item.degree === d ? "selected" : ""}>${d}</option>`).join("")}
      </select>
      <input placeholder="Field of study" value="${item.field_of_study || ""}" data-key="field_of_study" />
    </div>
  `;
  el.querySelector(".section-title button").addEventListener("click", () => {
    education.splice(idx, 1);
    renderEducation();
  });
  el.querySelectorAll("[data-key]").forEach((input) => {
    input.addEventListener("input", () => {
      education[idx][input.dataset.key] = input.value;
    });
    input.addEventListener("change", () => {
      education[idx][input.dataset.key] = input.value;
    });
  });
  return el;
}

function renderEducation() {
  const root = document.getElementById("educationList");
  root.innerHTML = "";
  education.forEach((item, idx) => root.appendChild(eduTemplate(item, idx)));
}

document.getElementById("addDesiredTitle").addEventListener("click", () => addChipValue("desired_title_input", desiredTitles, renderDesiredTitles));
document.getElementById("addDesiredDuty").addEventListener("click", () => addChipValue("desired_duty_input", desiredDuties, renderDesiredDuties));
document.getElementById("addLanguage").addEventListener("click", () => addChipValue("languageInput", languages, renderLanguages));
document.getElementById("addCertificate").addEventListener("click", () => addChipValue("certificateInput", certificates, renderCertificates));
document.getElementById("addMilitary").addEventListener("click", () => addChipValue("militaryInput", military, renderMilitary));

document.getElementById("addExperience").addEventListener("click", () => {
  experiences.push({ job_title:"", company:"", start_month:"", start_year:"", end_month:"", end_year:"", duties:[] });
  renderExperiences();
});

document.getElementById("addEducation").addEventListener("click", () => {
  education.push({ college_name:"", years_attended:"", degree:"", field_of_study:"" });
  renderEducation();
});

document.getElementById("has_previous_names").addEventListener("change", (e) => {
  const show = e.target.value === "yes";
  document.getElementById("previousNamesSection").classList.toggle("hidden", !show);

  if (!show) {
    previousNames = [];
    renderPreviousNames();
  }
});

document.getElementById("addPrevName").addEventListener("click", () => {
  previousNames.push("");
  renderPreviousNames();
});

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    first_name: document.getElementById("first_name").value,
    last_name: document.getElementById("last_name").value,
    phone: document.getElementById("phone").value,
    pronouns: document.getElementById("pronouns").value,
    previous_names: document.getElementById("previous_names").value
      ? document.getElementById("previous_names").value.split(",").map(x => x.trim()).filter(Boolean) : [],
    job_type: document.getElementById("job_type").value,
    desired_titles: desiredTitles,
    desired_duties: desiredDuties,
    experiences,
    education,
    languages,
    certificates,
    military
  };
  const { res, data } = await api("/candidate/profile", { method:"POST", body: JSON.stringify(body) });
  if (!res.ok) return alert(data.error || "Could not save profile");
  alert("Profile saved");
  loadMatches();
});

async function loadProfile() {
  const { res, data } = await api("/candidate/profile");
  if (!res.ok) return alert(data.error || "Could not load profile");
  const user = data.user;
  document.getElementById("first_name").value = user.first_name || "";
  document.getElementById("last_name").value = user.last_name || "";
  document.getElementById("phone").value = user.phone || "";
  document.getElementById("pronouns").value = user.pronouns || "";
  document.getElementById("previous_names").value = (user.previous_names || []).join(", ");
  document.getElementById("job_type").value = user.job_type || "";

  desiredTitles = user.desired_titles || [];
  desiredDuties = user.desired_duties || [];
  languages = data.languages || [];
  certificates = data.certificates || [];
  military = data.military || [];
  experiences = data.experiences || [];
  education = data.education || [];

  renderDesiredTitles();
  renderDesiredDuties();
  renderLanguages();
  renderCertificates();
  renderMilitary();
  renderExperiences();
  renderEducation();
}

async function loadMatches() {
  const { res, data } = await api("/jobs/matches");
  const root = document.getElementById("matches");
  root.innerHTML = "";
  if (!res.ok) { root.innerHTML = `<p>${data.error || "Could not load matches"}</p>`; return; }
  if (!data.length) { root.innerHTML = "<p>No matches yet. Try adding desired job titles or duties.</p>"; return; }

  data.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job";
    card.innerHTML = `
      <h3>${job.title}</h3>
      <p><strong>${job.company || "Employer"}</strong> · ${job.job_type || ""} · ${job.work_location || ""}</p>
      <p><strong>Match score:</strong> ${job.match_score}</p>
      <div class="chip-wrap">${(job.duties || []).map((d) => `<span class="pill">${d}</span>`).join("")}</div>
      <button>Apply now</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      const { res, data } = await api(`/jobs/${job.id}/apply`, { method:"POST" });
      if (!res.ok) return alert(data.error || "Could not apply");
      alert("Applied");
      loadApplications();
    });
    root.appendChild(card);
  });
}

async function loadApplications() {
  const { res, data } = await api("/candidate/applications");
  const root = document.getElementById("applications");
  root.innerHTML = "";
  if (!res.ok) { root.innerHTML = `<p>${data.error || "Could not load applications"}</p>`; return; }
  if (!data.length) { root.innerHTML = "<p>You haven't applied to any jobs yet.</p>"; return; }

  data.forEach((app) => {
    const card = document.createElement("div");
    card.className = "job";
    const showFollowup = app.status === "Pending" || app.status === "Interviewing" || app.status === "Offered";
    card.innerHTML = `
      <h3>${app.job?.title || "Job"}</h3>
      <p><strong>${app.job?.company || ""}</strong></p>
      <p>Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
      <p><span class="pill badge-${app.status}">${app.status}</span></p>
      <p class="muted">${
        app.status === "Pending" ? "Applied / not heard back yet" :
        app.status === "Denied" ? "Denied" :
        app.status === "Accepted" ? "Accepted" :
        app.status === "Offered" ? "Offer received" :
        app.status === "Interviewing" ? "Interview stage" :
        app.status === "No Response" ? "Employer did not respond in time" :
        app.status
      }</p>
      ${showFollowup ? '<button class="secondary small">Follow up</button>' : ""}
    `;
    const btn = card.querySelector("button");
    if (btn) {
      btn.addEventListener("click", async () => {
        const { res, data } = await api(`/applications/${app.id}/followup`, {
          method: "POST",
          body: JSON.stringify({})
        });
        if (!res.ok) return alert(data.error || "Could not send follow up");
        alert("Follow-up sent");
      });
    }
    root.appendChild(card);
  });
}

(async () => {
  const ok = await confirmAccess();
  if (!ok) return;
  loadProfile();
  loadMatches();
  loadApplications();
})();
