
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_KEY || ""
);

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/", (_req, res) => {
  res.json({ ok: true, app: "Next Horizons API" });
});

app.post("/auth/signup", async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        first_name,
        last_name,
        email,
        password_hash,
        role
      })
      .select("id, first_name, last_name, email, role")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const token = makeToken(data);
    return res.json({ token, user: data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = makeToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/me", authRequired, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role, phone, pronouns, job_type, desired_titles, desired_duties")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/candidate/profile", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") {
    return res.status(403).json({ error: "Candidate only" });
  }

  try {
    const payload = {
      first_name: req.body.first_name || null,
      last_name: req.body.last_name || null,
      phone: req.body.phone || null,
      pronouns: req.body.pronouns || null,
      previous_names: req.body.previous_names || null,
      job_type: req.body.job_type || null,
      desired_titles: req.body.desired_titles || [],
      desired_duties: req.body.desired_duties || []
    };

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/employer/jobs", authRequired, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Employer only" });
  }

  try {
    const job = {
      employer_id: req.user.id,
      company: req.body.company,
      title: req.body.title,
      duties: req.body.duties || [],
      education_req: req.body.education_req || [],
      experience_req: req.body.experience_req || [],
      work_location: req.body.work_location || null,
      remote_scope: req.body.remote_scope || null,
      timezone_hiring_for: req.body.timezone_hiring_for || null,
      timezone_hiring_from: req.body.timezone_hiring_from || null,
      days_shifts: req.body.days_shifts || [],
      pay_rate: req.body.pay_rate || null,
      job_type: req.body.job_type || null,
      verified: true
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert(job)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/employer/jobs", authRequired, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Employer only" });
  }

  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("employer_id", req.user.id)
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.get("/jobs/matches", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") {
    return res.status(403).json({ error: "Candidate only" });
  }

  try {
    const { data: candidate, error: candidateError } = await supabase
      .from("users")
      .select("job_type, desired_titles, desired_duties")
      .eq("id", req.user.id)
      .single();

    if (candidateError) {
      return res.status(500).json({ error: candidateError.message });
    }

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("verified", true);

    if (jobsError) {
      return res.status(500).json({ error: jobsError.message });
    }

    const desiredTitles = candidate.desired_titles || [];
    const desiredDuties = candidate.desired_duties || [];

    const scored = (jobs || []).map((job) => {
      let score = 0;

      if (candidate.job_type && job.job_type === candidate.job_type) score += 3;

      const title = (job.title || "").toLowerCase();
      for (const wanted of desiredTitles) {
        if (title.includes(String(wanted).toLowerCase())) score += 4;
      }

      const duties = Array.isArray(job.duties) ? job.duties : [];
      for (const duty of duties) {
        if (desiredDuties.map(String).map(s => s.toLowerCase()).includes(String(duty).toLowerCase())) {
          score += 2;
        }
      }

      return { ...job, match_score: score };
    }).sort((a, b) => b.match_score - a.match_score);

    return res.json(scored);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.post("/jobs/:id/apply", authRequired, async (req, res) => {
  if (req.user.role !== "candidate") {
    return res.status(403).json({ error: "Candidate only" });
  }

  try {
    const jobId = Number(req.params.id);

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", req.user.id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "Already applied" });
    }

    const { data: allApps } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId);

    if ((allApps || []).length >= 20) {
      return res.status(400).json({ error: "This job has reached the 20-application cap." });
    }

    const { data, error } = await supabase
      .from("applications")
      .insert({
        job_id: jobId,
        candidate_id: req.user.id,
        status: "Pending",
        auto_applied: false
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Next Horizons API running on port ${PORT}`);
});
