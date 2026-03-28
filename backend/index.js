
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_KEY || "");

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: "Invalid token" }); }
}
async function replaceRows(table, candidateId, rows) {
  const del = await supabase.from(table).delete().eq("candidate_id", candidateId);
  if (del.error) throw del.error;
  if (!rows.length) return;
  const ins = await supabase.from(table).insert(rows.map(r => ({...r, candidate_id: candidateId})));
  if (ins.error) throw ins.error;
}
app.get("/", (_req, res) => res.json({ ok: true, app: "Next Horizons API v2" }));

app.post("/auth/signup", async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;
    if (!first_name || !last_name || !email || !password || !role) return res.status(400).json({ error: "Missing required fields" });
    const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) return res.status(400).json({ error: "Email already exists" });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from("users").insert({ first_name, last_name, email, password_hash, role }).select("id, first_name, last_name, email, role").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ token: makeToken(data), user: data });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });
    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) return res.status(400).json({ error: "Invalid email or password" });
    return res.json({ token: makeToken(user), user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role } });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

app.get("/me", authRequired, async (req, res) => {
  const { data, error } = await supabase.from("users").select("id, first_name, last_name, email, role, phone, pronouns, previous_names, job_type, desired_titles, desired_duties").eq("id", req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.get("/candidate/profile", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") return res.status(403).json({ error: "Candidate only" });
  try {
    const { data: user, error: userError } = await supabase.from("users").select("id, first_name, last_name, email, phone, pronouns, previous_names, job_type, desired_titles, desired_duties").eq("id", req.user.id).single();
    if (userError) return res.status(500).json({ error: userError.message });
    const [exp, edu, lang, certs, mil] = await Promise.all([
      supabase.from("candidate_experiences").select("*").eq("candidate_id", req.user.id).order("id"),
      supabase.from("candidate_education").select("*").eq("candidate_id", req.user.id).order("id"),
      supabase.from("candidate_languages").select("*").eq("candidate_id", req.user.id).order("id"),
      supabase.from("candidate_certificates").select("*").eq("candidate_id", req.user.id).order("id"),
      supabase.from("candidate_military").select("*").eq("candidate_id", req.user.id).order("id")
    ]);
    for (const r of [exp, edu, lang, certs, mil]) if (r.error) return res.status(500).json({ error: r.error.message });
    return res.json({
      user,
      experiences: exp.data || [],
      education: edu.data || [],
      languages: (lang.data || []).map(x => x.language),
      certificates: (certs.data || []).map(x => x.name),
      military: (mil.data || []).map(x => x.details)
    });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

app.post("/candidate/profile", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") return res.status(403).json({ error: "Candidate only" });
  try {
    const candidateId = req.user.id;
    const { first_name, last_name, phone, pronouns, previous_names, job_type, desired_titles, desired_duties,
            experiences = [], education = [], languages = [], certificates = [], military = [] } = req.body;
    const up = await supabase.from("users").update({
      first_name: first_name || null, last_name: last_name || null, phone: phone || null, pronouns: pronouns || null,
      previous_names: previous_names || [], job_type: job_type || null, desired_titles: desired_titles || [], desired_duties: desired_duties || []
    }).eq("id", candidateId);
    if (up.error) return res.status(500).json({ error: up.error.message });

    await replaceRows("candidate_experiences", candidateId, experiences.map(x => ({
      job_title: x.job_title || null, company: x.company || null, start_month: x.start_month || null, start_year: x.start_year || null,
      end_month: x.end_month || null, end_year: x.end_year || null, duties: x.duties || []
    })));
    await replaceRows("candidate_education", candidateId, education.map(x => ({
      college_name: x.college_name || null, years_attended: x.years_attended || null, degree: x.degree || null, field_of_study: x.field_of_study || null
    })));
    await replaceRows("candidate_languages", candidateId, languages.map(language => ({ language })));
    await replaceRows("candidate_certificates", candidateId, certificates.map(name => ({ name })));
    await replaceRows("candidate_military", candidateId, military.map(details => ({ details })));
    return res.json({ ok: true });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

app.post("/employer/jobs", authRequired, async (req, res) => {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Employer only" });
  const payload = {
    employer_id: req.user.id, company: req.body.company || null, title: req.body.title || null, duties: req.body.duties || [],
    education_req: req.body.education_req || [], experience_req: req.body.experience_req || [], work_location: req.body.work_location || null,
    remote_scope: req.body.remote_scope || null, timezone_hiring_for: req.body.timezone_hiring_for || null, timezone_hiring_from: req.body.timezone_hiring_from || null,
    days_shifts: req.body.days_shifts || [], pay_rate: req.body.pay_rate || null, job_type: req.body.job_type || null, verified: true
  };
  const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.get("/employer/jobs", authRequired, async (req, res) => {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Employer only" });
  const { data, error } = await supabase.from("jobs").select("*").eq("employer_id", req.user.id).order("id", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.get("/employer/applications", authRequired, async (req, res) => {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Employer only" });
  const { data: jobs, error: jobsError } = await supabase.from("jobs").select("id, title, company").eq("employer_id", req.user.id);
  if (jobsError) return res.status(500).json({ error: jobsError.message });
  if (!jobs.length) return res.json([]);
  const jobIds = jobs.map(j => j.id);
  const { data: applications, error: appError } = await supabase.from("applications").select("id, job_id, candidate_id, applied_at, status, auto_applied").in("job_id", jobIds).order("applied_at", { ascending: false });
  if (appError) return res.status(500).json({ error: appError.message });
  const candidateIds = [...new Set((applications || []).map(a => a.candidate_id))];
  let candidates = [];
  if (candidateIds.length) {
    const { data, error } = await supabase.from("users").select("id, first_name, last_name, email").in("id", candidateIds);
    if (error) return res.status(500).json({ error: error.message });
    candidates = data || [];
  }
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
  const candidateMap = Object.fromEntries(candidates.map(c => [c.id, c]));
  return res.json((applications || []).map(a => ({ ...a, job: jobMap[a.job_id] || null, candidate: candidateMap[a.candidate_id] || null })));
});

app.patch("/employer/applications/:id", authRequired, async (req, res) => {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Employer only" });
  const applicationId = Number(req.params.id);
  const status = req.body.status;
  const allowed = ["Pending", "Interviewing", "Denied", "Offered", "Accepted", "No Response"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const { data: appRow, error: appError } = await supabase.from("applications").select("id, job_id").eq("id", applicationId).single();
  if (appError) return res.status(500).json({ error: appError.message });
  const { data: job, error: jobError } = await supabase.from("jobs").select("id, employer_id").eq("id", appRow.job_id).single();
  if (jobError) return res.status(500).json({ error: jobError.message });
  if (job.employer_id !== req.user.id) return res.status(403).json({ error: "Not your application" });
  const { data, error } = await supabase.from("applications").update({ status }).eq("id", applicationId).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.get("/candidate/applications", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") return res.status(403).json({ error: "Candidate only" });
  const { data: applications, error } = await supabase.from("applications").select("id, job_id, applied_at, status, auto_applied").eq("candidate_id", req.user.id).order("applied_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const jobIds = (applications || []).map(a => a.job_id);
  let jobs = [];
  if (jobIds.length) {
    const { data, error: jobsError } = await supabase.from("jobs").select("id, title, company").in("id", jobIds);
    if (jobsError) return res.status(500).json({ error: jobsError.message });
    jobs = data || [];
  }
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
  return res.json((applications || []).map(a => ({ ...a, job: jobMap[a.job_id] || null })));
});

app.get("/jobs/matches", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") return res.status(403).json({ error: "Candidate only" });
  const { data: candidate, error: cErr } = await supabase.from("users").select("job_type, desired_titles, desired_duties").eq("id", req.user.id).single();
  if (cErr) return res.status(500).json({ error: cErr.message });
  const { data: jobs, error: jErr } = await supabase.from("jobs").select("*").eq("verified", true);
  if (jErr) return res.status(500).json({ error: jErr.message });
  const desiredTitles = (candidate.desired_titles || []).map(x => String(x).toLowerCase());
  const desiredDuties = (candidate.desired_duties || []).map(x => String(x).toLowerCase());
  const scored = (jobs || []).map(job => {
    let score = 0;
    if (candidate.job_type && job.job_type === candidate.job_type) score += 3;
    if (desiredTitles.some(w => (job.title || "").toLowerCase().includes(w))) score += 4;
    for (const duty of (job.duties || [])) if (desiredDuties.includes(String(duty).toLowerCase())) score += 2;
    return { ...job, match_score: score };
  }).sort((a,b) => b.match_score - a.match_score);
  return res.json(scored);
});

app.post("/jobs/:id/apply", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") return res.status(403).json({ error: "Candidate only" });
  const jobId = Number(req.params.id);
  const { data: existing } = await supabase.from("applications").select("id").eq("job_id", jobId).eq("candidate_id", req.user.id).maybeSingle();
  if (existing) return res.status(400).json({ error: "Already applied" });
  const { data: allApps } = await supabase.from("applications").select("id").eq("job_id", jobId);
  if ((allApps || []).length >= 20) return res.status(400).json({ error: "This job has reached the 20-application cap." });
  const { data, error } = await supabase.from("applications").insert({ job_id: jobId, candidate_id: req.user.id, status: "Pending", auto_applied: false }).select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.listen(PORT, () => console.log(`Next Horizons API v2 running on port ${PORT}`));
