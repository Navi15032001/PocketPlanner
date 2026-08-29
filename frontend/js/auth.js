// ===============================
// REGISTER
// ===============================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const message = document.getElementById("message");

        if (password !== confirmPassword) {
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Passwords do not match.
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/accounts/register/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = Object.values(data).flat().join("<br>");
                message.innerHTML = `
                    <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                        ${errorMessage}
                    </div>
                `;
                return;
            }

            message.innerHTML = `
                <div class="alert alert-success p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Account created successfully! Redirecting to login...
                </div>
            `;

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            console.error("Register error:", error);
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Unable to connect to server.
                </div>
            `;
        }
    });
}

// ===============================
// LOGIN
// ===============================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");

        try {
            const response = await fetch(
                `${API_BASE_URL}/accounts/login/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.innerHTML = `
                    <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                        Invalid username or password.
                    </div>
                `;
                return;
            }

            // Save JWT tokens
            localStorage.setItem("access_token", data.access);
            localStorage.setItem("refresh_token", data.refresh);

            message.innerHTML = `
                <div class="alert alert-success p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Login successful! Redirecting...
                </div>
            `;

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 600);

        } catch (error) {
            console.error("Login error:", error);
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Unable to connect to server.
                </div>
            `;
        }
    });
}

// ===============================
// FORGOT PASSWORD
// ===============================
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message");
        const resetPageUrl = window.location.href.replace("forgot-password.html", "reset-password.html");

        try {
            const response = await fetch(
                `${API_BASE_URL}/accounts/password-reset/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email,
                        frontend_url: resetPageUrl
                    })
                }
            );

            const data = await response.json();

            message.innerHTML = `
                <div class="alert alert-success p-3" style="font-size: 13px; border-radius: var(--radius-md); line-height: 1.5;">
                    📩 ${data.detail || "If this account exists, a password reset link has been sent to your email inbox. Please check your inbox and click the reset button inside the email."}
                </div>
            `;

        } catch (error) {
            console.error("Forgot password error:", error);
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Unable to connect to server.
                </div>
            `;
        }
    });
}

// ===============================
// RESET PASSWORD CONFIRM
// ===============================
const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const uid = document.getElementById("resetUid").value.trim();
        const token = document.getElementById("resetToken").value.trim();
        const newPassword = document.getElementById("new_password").value;
        const confirmPassword = document.getElementById("confirm_password").value;
        const message = document.getElementById("message");

        if (!uid || !token) {
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Missing User ID or Reset Token. Please use the link from your email.
                </div>
            `;
            return;
        }

        if (newPassword !== confirmPassword) {
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Passwords do not match.
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/accounts/password-reset-confirm/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid: uid,
                        token: token,
                        new_password: newPassword
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = Object.values(data).flat().join("<br>");
                message.innerHTML = `
                    <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                        ${errorMessage}
                    </div>
                `;
                return;
            }

            message.innerHTML = `
                <div class="alert alert-success p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    ${data.detail || "Password reset successfully! Redirecting to login..."}
                </div>
            `;

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (error) {
            console.error("Reset password error:", error);
            message.innerHTML = `
                <div class="alert alert-danger p-2" style="font-size: 13.5px; border-radius: var(--radius-md);">
                    Unable to connect to server.
                </div>
            `;
        }
    });
}