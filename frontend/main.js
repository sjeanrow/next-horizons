const statusEl = document.getElementById("status");
const gateStatusEl = document.getElementById("gateStatus");
const gateSection = document.getElementById("gateSection");
const authArea = document.getElementById("authArea");

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b3261e" : "#2e7d32";
}

function showGateStatus(message, isError = false) {
  gateStatusEl.textContent = message;
  gateStatusEl.style.color = isError ? "#b3261e" : "#2e7d32";
}

function getSitePassword() {
  return localStorage.getItem("nh_site_password") || "";
}

async function checkSitePassword(password) {
  const res = await fetch(`${window.API_URL}/beta/check`, {
    method: "POST",
    headers: { "x-site-password": password }
  });
  const data = await res.json();
  return { res, data };
}

async function unlockIfStored() {
  const stored = getSitePassword();
  if (!stored) return;
  const { res } = await checkSitePassword(stored);
  if (res.ok) {
    gateSection.classList.add("hidden");
    authArea.classList.remove("hidden");
  } else {
    localStorage.removeItem("nh_site_password");
  }
}

document.getElementById("gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("sitePassword").value;
  const { res, data } = await checkSitePassword(password);
  if (!res.ok) return showGateStatus(data.error || "Could not unlock site", true);
  localStorage.setItem("nh_site_password", password);
  gateSection.classList.add("hidden");
  authArea.classList.remove("hidden");
  showGateStatus("");
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    first_name: document.getElementById("signupFirst").value,
    last_name: document.getElementById("signupLast").value,
    email: document.getElementById("signupEmail").value,
    password: document.getElementById("signupPassword").value,
    role: document.getElementById("signupRole").value
  };

  const res = await fetch(`${window.API_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "x-site-password": getSitePassword()
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) return showStatus(data.error || "Signup failed", true);

  localStorage.setItem("nh_token", data.token);
  localStorage.setItem("nh_role", data.user.role);
  location.href = data.user.role === "candidate" ? "candidate.html" : "employer.html";
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };

  const res = await fetch(`${window.API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "x-site-password": getSitePassword()
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) return showStatus(data.error || "Login failed", true);

  localStorage.setItem("nh_token", data.token);
  localStorage.setItem("nh_role", data.user.role);
  location.href = data.user.role === "candidate" ? "candidate.html" : "employer.html";
});

unlockIfStored();
