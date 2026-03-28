
const statusEl = document.getElementById("status");
function showStatus(message, isError = false) { statusEl.textContent = message; statusEl.style.color = isError ? "#b3261e" : "#2e7d32"; }
document.getElementById("signupForm").addEventListener("submit", async (e) => {
 e.preventDefault();
 const body = { first_name: signupFirst.value, last_name: signupLast.value, email: signupEmail.value, password: signupPassword.value, role: signupRole.value };
 const res = await fetch(`${window.API_URL}/auth/signup`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
 const data = await res.json(); if (!res.ok) return showStatus(data.error || "Signup failed", true);
 localStorage.setItem("nh_token", data.token); localStorage.setItem("nh_role", data.user.role);
 location.href = data.user.role === "candidate" ? "candidate.html" : "employer.html";
});
document.getElementById("loginForm").addEventListener("submit", async (e) => {
 e.preventDefault();
 const body = { email: loginEmail.value, password: loginPassword.value };
 const res = await fetch(`${window.API_URL}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
 const data = await res.json(); if (!res.ok) return showStatus(data.error || "Login failed", true);
 localStorage.setItem("nh_token", data.token); localStorage.setItem("nh_role", data.user.role);
 location.href = data.user.role === "candidate" ? "candidate.html" : "employer.html";
});
