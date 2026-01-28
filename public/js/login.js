document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Save JWT
      localStorage.setItem("fp_token", data.token);

      // Redirect to dashboard
      window.location.href = "/dashboard.html";

    } catch (err) {
      errorBox.textContent = err.message;
    }
  });
});
