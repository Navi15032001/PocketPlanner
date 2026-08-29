// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "login.html";
}

const languageNames = { EN: "English", HI: "Hindi" };
const themeNames = { LIGHT: "Light", DARK: "Dark" };

async function loadProfile() {
    try {
        const profile = await apiRequest("/accounts/profile/");

        const fullName = profile.full_name || profile.username;

        document.getElementById("profileFullName").textContent = fullName;
        document.getElementById("avatarInitial").textContent = fullName.charAt(0).toUpperCase();
        document.getElementById("profileMemberSince").textContent =
            profile.created_at ? `Member since ${new Date(profile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : "";

        document.getElementById("profileUsername").textContent = profile.username;
        document.getElementById("profileEmail").textContent = profile.email;
        document.getElementById("profileIncome").textContent = `₹${Number(profile.opening_balance).toLocaleString("en-IN")}`;
        document.getElementById("profileCurrency").textContent = profile.currency;
        document.getElementById("profileLanguage").textContent = languageNames[profile.language] || profile.language;
        document.getElementById("profileTheme").textContent = themeNames[profile.theme] || profile.theme;
    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

loadProfile();
