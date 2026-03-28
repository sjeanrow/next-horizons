
const statusEl = document.getElementById("status");

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c62828" : "#1b5e20";
}

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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) return showStatus(data.error || "Login failed", true);

  localStorage.setItem("nh_token", data.token);
  localStorage.setItem("nh_role", data.user.role);

  location.href = data.user.role === "candidate" ? "candidate.html" : "employer.html";
});
