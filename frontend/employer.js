
function token(){return localStorage.getItem("nh_token")}
function logout(){localStorage.clear();location.href="index.html"}
async function api(path, options={}){ const res = await fetch(`${window.API_URL}${path}`, {...options, headers: {"Content-Type":"application/json","Authorization":`Bearer ${token()}`,...(options.headers||{})}}); const data = await res.json(); return {res,data};}
function setTabs(){ document.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click",()=>{ document.querySelectorAll("section[id$='Tab']").forEach(s=>s.classList.add("hidden")); document.getElementById(btn.dataset.tab).classList.remove("hidden"); }));}
function renderChips(root, values, onRemove){ root.innerHTML=""; values.forEach((value,index)=>{ const chip=document.createElement("div"); chip.className="chip"; chip.innerHTML=`<span>${value}</span><button type="button">×</button>`; chip.querySelector("button").addEventListener("click",()=>onRemove(index)); root.appendChild(chip); });}

if (!token()) location.href = "index.html";
document.getElementById("logoutBtn").addEventListener("click", logout);
setTabs();
let duties=[], educationReq=[], experienceReq=[], dayShifts=[];
function addChipValue(inputId, arr, renderFn){ const input=document.getElementById(inputId); const value=input.value.trim(); if(!value) return; arr.push(value); input.value=""; renderFn(); }
function renderDuties(){ renderChips(document.getElementById("dutyChips"), duties, i=>{duties.splice(i,1);renderDuties();});}
function renderEducationReq(){ renderChips(document.getElementById("educationReqChips"), educationReq, i=>{educationReq.splice(i,1);renderEducationReq();});}
function renderExperienceReq(){ renderChips(document.getElementById("experienceReqChips"), experienceReq, i=>{experienceReq.splice(i,1);renderExperienceReq();});}
function renderDayShifts(){ renderChips(document.getElementById("dayShiftChips"), dayShifts, i=>{dayShifts.splice(i,1);renderDayShifts();});}
addDuty.addEventListener("click",()=>addChipValue("dutyInput", duties, renderDuties));
addEducationReq.addEventListener("click",()=>addChipValue("educationReqInput", educationReq, renderEducationReq));
addExperienceReq.addEventListener("click",()=>addChipValue("experienceReqInput", experienceReq, renderExperienceReq));
addDayShift.addEventListener("click",()=>addChipValue("daysInput", dayShifts, renderDayShifts));
jobForm.addEventListener("submit", async (e)=>{
 e.preventDefault();
 const body={company:company.value,title:title.value,duties,education_req:educationReq,experience_req:experienceReq,work_location:work_location.value,remote_scope:remote_scope.value,timezone_hiring_for:timezone_hiring_for.value,timezone_hiring_from:timezone_hiring_from.value,days_shifts:dayShifts,pay_rate:pay_rate.value,job_type:job_type.value};
 const {res,data}=await api("/employer/jobs",{method:"POST",body:JSON.stringify(body)});
 if(!res.ok) return alert(data.error||"Could not post job");
 alert("Job posted"); duties=[]; educationReq=[]; experienceReq=[]; dayShifts=[]; renderDuties(); renderEducationReq(); renderExperienceReq(); renderDayShifts(); jobForm.reset(); loadJobs(); loadApplications();
});
async function loadJobs(){
 const {res,data}=await api("/employer/jobs"); const root=document.getElementById("jobs"); root.innerHTML="";
 if(!res.ok){root.innerHTML=`<p>${data.error||"Could not load jobs"}</p>`; return;}
 if(!data.length){root.innerHTML="<p>No jobs posted yet.</p>"; return;}
 data.forEach(job=>{ const card=document.createElement("div"); card.className="job"; card.innerHTML=`<h3>${job.title}</h3><p><strong>${job.company||""}</strong> · ${job.job_type||""}</p><div class="chip-wrap">${(job.duties||[]).map(d=>`<span class="pill">${d}</span>`).join("")}</div><p><strong>Pay:</strong> ${job.pay_rate||""}</p><p><strong>Location:</strong> ${job.work_location||""}</p>`; root.appendChild(card); });
}
async function loadApplications(){
 const {res,data}=await api("/employer/applications"); const root=document.getElementById("applications"); root.innerHTML="";
 if(!res.ok){root.innerHTML=`<p>${data.error||"Could not load applications"}</p>`; return;}
 if(!data.length){root.innerHTML="<p>No applications yet.</p>"; return;}
 data.forEach(app=>{ const card=document.createElement("div"); card.className="job";
 card.innerHTML=`<h3>${app.job?.title||"Job"}</h3><p><strong>${app.candidate?.first_name||""} ${app.candidate?.last_name||""}</strong> · ${app.candidate?.email||""}</p><p>Applied: ${new Date(app.applied_at).toLocaleDateString()}</p><div class="row"><span class="pill badge-${app.status}">${app.status}</span><select>${["Pending","Interviewing","Denied","Offered","Accepted","No Response"].map(s=>`<option ${s===app.status?"selected":""}>${s}</option>`).join("")}</select></div><button class="secondary small">Update status</button>`;
 const select=card.querySelector("select");
 card.querySelector("button").addEventListener("click", async ()=>{ const {res,data}=await api(`/employer/applications/${app.id}`,{method:"PATCH",body:JSON.stringify({status:select.value})}); if(!res.ok) return alert(data.error||"Could not update status"); alert("Status updated"); loadApplications();});
 root.appendChild(card); });
}
loadJobs(); loadApplications();
