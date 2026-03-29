
function token(){return localStorage.getItem("nh_token")}
function getSitePassword() { return localStorage.getItem("nh_site_password") || ""; }
function logout(){localStorage.clear();location.href="index.html"}
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
async function api(path, options={}){ const res = await fetch(`${window.API_URL}${path}`, {...options, headers: {"Content-Type":"application/json","Authorization":`Bearer ${token()}`, "x-site-password": getSitePassword(),...(options.headers||{})}}); const data = await res.json(); return {res,data};}
function setTabs(){ document.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click",()=>{ document.querySelectorAll("section[id$='Tab']").forEach(s=>s.classList.add("hidden")); document.getElementById(btn.dataset.tab).classList.remove("hidden"); }));}
function renderChips(root, values, onRemove){ root.innerHTML=""; values.forEach((value,index)=>{ const chip=document.createElement("div"); chip.className="chip"; chip.innerHTML=`<span>${value}</span><button type="button">×</button>`; chip.querySelector("button").addEventListener("click",()=>onRemove(index)); root.appendChild(chip); });}

if (!token()) location.href = "index.html";
document.getElementById("logoutBtn").addEventListener("click", logout);
setTabs();
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let selectedDays = [];
let shifts = {};
let employerJobs = [];
let employerApplications = [];
function addChipValue(inputId, arr, renderFn){ const input=document.getElementById(inputId); const value=input.value.trim(); if(!value) return; arr.push(value); input.value=""; renderFn(); }
function renderDuties(){ renderChips(document.getElementById("dutyChips"), duties, i=>{duties.splice(i,1);renderDuties();});}
function renderEducationReq(){ renderChips(document.getElementById("educationReqChips"), educationReq, i=>{educationReq.splice(i,1);renderEducationReq();});}
function renderExperienceReq(){ renderChips(document.getElementById("experienceReqChips"), experienceReq, i=>{experienceReq.splice(i,1);renderExperienceReq();});}
addDuty.addEventListener("click",()=>addChipValue("dutyInput", duties, renderDuties));
addEducationReq.addEventListener("click",()=>addChipValue("educationReqInput", educationReq, renderEducationReq));
addExperienceReq.addEventListener("click",()=>addChipValue("experienceReqInput", experienceReq, renderExperienceReq));
jobForm.addEventListener("submit", async (e)=>{
 e.preventDefault();
 const body={company:company.value,title:title.value,duties,education_req:educationReq,experience_req:experienceReq,work_location:work_location.value,remote_scope:remote_scope.value,timezone_hiring_for:timezone_hiring_for.value,timezone_hiring_from:timezone_hiring_from.value,days_shifts: selectedDays.map(day => `${day}: ${shifts[day] || ""}`),pay_rate:pay_rate.value,job_type:job_type.value};
 const {res,data}=await api("/employer/jobs",{method:"POST",body:JSON.stringify(body)});
 if(!res.ok) return alert(data.error||"Could not post job");
 alert("Job posted");

duties = [];
educationReq = [];
experienceReq = [];

selectedDays = [];
shifts = {};

renderDuties();
renderEducationReq();
renderExperienceReq();
renderDayButtons();
renderShiftInputs();

jobForm.reset();
loadJobs();
loadApplications();
 });

function renderDayButtons() {
  const root = document.getElementById("daysSelect");
  root.innerHTML = "";

  weekdays.forEach((day) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selectedDays.includes(day) ? "small" : "secondary small";
    btn.textContent = day;

    btn.addEventListener("click", () => {
      if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter((d) => d !== day);
        delete shifts[day];
      } else {
        selectedDays.push(day);
        shifts[day] = shifts[day] || "";
      }

      renderDayButtons();
      renderShiftInputs();
    });
    root.appendChild(btn);
  });
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

  jobsEl.textContent = activeJobs;
  applicantsEl.textContent = totalApplicants;
  pendingEl.textContent = pendingResponses;
  responseEl.textContent = `${responseRate}%`;
}

function renderShiftInputs() {
  const root = document.getElementById("shiftsContainer");
  root.innerHTML = "";

  selectedDays.forEach((day) => {
    const wrap = document.createElement("div");
    wrap.className = "entry";
    wrap.innerHTML = `
      <h4>${day}</h4>
      <input placeholder="${day} shift(s)" value="${shifts[day] || ""}" />
    `;

    const input = wrap.querySelector("input");
    input.addEventListener("input", (e) => {
      shifts[day] = e.target.value;
    });

    root.appendChild(wrap);
  });
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
    card.innerHTML = `<h3>${job.title}</h3><p><strong>${job.company || ""}</strong> · ${job.job_type || ""}</p><div class="chip-wrap">${(job.duties || []).map(d => `<span class="pill">${d}</span>`).join("")}</div><p><strong>Pay:</strong> ${job.pay_rate || ""}</p><p><strong>Location:</strong> ${job.work_location || ""}</p>`;
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

  data.forEach(app => {
    const card = document.createElement("div");
    card.className = "job";
    card.innerHTML = `<h3>${app.job?.title || "Job"}</h3><p><strong>${app.candidate?.first_name || ""} ${app.candidate?.last_name || ""}</strong> · ${app.candidate?.email || ""}</p><p>Applied: ${new Date(app.applied_at).toLocaleDateString()}</p><div class="row"><span class="pill badge-${app.status}">${app.status}</span><select>${["Pending","Interviewing","Denied","Offered","Accepted","No Response"].map(s => `<option ${s === app.status ? "selected" : ""}>${s}</option>`).join("")}</select></div><button class="secondary small">Update status</button>`;

    const select = card.querySelector("select");
    card.querySelector("button").addEventListener("click", async () => {
      const { res, data } = await api(`/employer/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value })
      });
      if (!res.ok) return alert(data.error || "Could not update status");
      alert("Status updated");
      loadApplications();
    });

    root.appendChild(card);
  });
}
(async () => {
  const ok = await confirmAccess();
  if (!ok) return;

  renderDayButtons();
  renderShiftInputs();

  loadJobs();
  loadApplications();
})();
