// ===============================
// SETTINGS LOGIC
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();

    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
        settingsForm.addEventListener("submit", updateSettings);
    }

    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", changePassword);
    }

    const langSelect = document.getElementById("language");
    if (langSelect) {
        langSelect.addEventListener("change", function () {
            applyLanguage(this.value);
        });
    }
});

async function loadSettings() {
    try {
        const res = await apiRequest("/accounts/profile/");

        if (document.getElementById("full_name")) document.getElementById("full_name").value = res.full_name || "";
        if (document.getElementById("email")) document.getElementById("email").value = res.email || "";
        if (document.getElementById("monthly_income")) document.getElementById("monthly_income").value = res.opening_balance || 0;
        if (document.getElementById("currency")) document.getElementById("currency").value = res.currency || "INR";
        
        const activeLang = res.language || localStorage.getItem("pp_language") || "EN";
        if (document.getElementById("language")) {
            document.getElementById("language").value = activeLang;
        }
        applyLanguage(activeLang);

        if (document.getElementById("theme")) document.getElementById("theme").value = res.theme || "LIGHT";
        applyTheme(res.theme || "LIGHT");
    } catch (err) {
        console.error("Failed to load settings", err);
        showToast("Could not load settings.", "error");
    }
}

async function updateSettings(e) {
    e.preventDefault();

    const payload = {
        full_name: document.getElementById("full_name").value.trim(),
        email: document.getElementById("email").value.trim(),
        opening_balance: document.getElementById("monthly_income").value,
        currency: document.getElementById("currency").value,
        language: document.getElementById("language").value,
        theme: document.getElementById("theme").value,
    };

    try {
        await apiRequest("/accounts/profile/", {
            method: "PATCH",
            body: JSON.stringify(payload)
        });

        applyLanguage(payload.language);
        applyTheme(payload.theme);
        populateSidebarUser();

        showToast(payload.language === "HI" ? "प्राथमिकताएं सफलतापूर्वक अपडेट हो गईं!" : "Settings updated successfully!", "success");
    } catch (err) {
        console.error("Failed to update settings", err);
        showToast("Could not save settings.", "error");
    }
}

async function changePassword(e) {
    e.preventDefault();

    const oldPassword = document.getElementById("old_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (newPassword !== confirmPassword) {
        showToast("New passwords do not match.", "error");
        return;
    }

    try {
        await apiRequest("/accounts/change-password/", {
            method: "POST",
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
            }),
        });
        showToast("Password changed successfully!", "success");
        e.target.reset();
    } catch (err) {
        console.error("Failed to change password", err);
        showToast("Could not change password. Please verify current password.", "error");
    }
}
