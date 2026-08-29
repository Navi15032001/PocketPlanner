// ===============================
// POCKETPLANNER API & CORE CLIENT
// ===============================

// Auto-detect local vs production live backend URL
const LOCAL_BACKEND = "http://127.0.0.1:8000/api";
const PROD_BACKEND = localStorage.getItem("pp_api_base") || "https://pocketplanner-backend-1557.onrender.com/api";

const API_BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
    ? LOCAL_BACKEND
    : PROD_BACKEND;

function getAccessToken() {
    return localStorage.getItem("access_token");
}

function getRefreshToken() {
    return localStorage.getItem("refresh_token");
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "login.html";
}

// ===============================
// Global Theme Management
// ===============================
function initTheme() {
    const savedTheme = localStorage.getItem("pp_theme") || "LIGHT";
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    if (theme === "DARK") {
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.add("dark-theme");
    } else {
        document.documentElement.removeAttribute("data-theme");
        document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("pp_theme", theme);
}

// ===============================
// Global i18n Translation Engine (Hindi & English)
// ===============================
const TRANSLATIONS = {
    EN: {
        "Overview": "Overview",
        "Dashboard": "Dashboard",
        "Finance": "Finance",
        "Income": "Income",
        "Expenses": "Expenses",
        "Budgets": "Budgets",
        "Planning": "Planning",
        "Goals": "Goals",
        "Savings": "Savings",
        "Calendar": "Calendar",
        "Analytics & Settings": "Analytics & Settings",
        "Reports": "Reports",
        "Categories": "Categories",
        "Profile": "Profile",
        "Settings": "Settings",
        "Logout": "Logout",
        "Personal Account": "Personal Account",
        "Home": "Home",
        "Expense": "Expense",
        "Budget": "Budget",
        "More": "More",
        "Available Cash": "Available Cash",
        "Free unreserved balance": "Free unreserved balance",
        "Current Balance": "Current Balance",
        "Opening + Income - Expenses": "Opening + Income - Expenses",
        "Month Expenses": "Month Expenses",
        "Current month spending": "Current month spending",
        "Total Reserved": "Total Reserved",
        "Budgets + Savings goals": "Budgets + Savings goals",
        "Financial Health Score": "Financial Health Score",
        "Budget Allocation": "Budget Allocation",
        "Quick Expense Fast-Log": "Quick Expense Fast-Log",
        "Recent Transactions": "Recent Transactions",
        "Income vs Expense Trend": "Income vs Expense Trend",
        "Smart Financial Insights": "Smart Financial Insights",
        "Month-End Outflow Forecast": "Month-End Outflow Forecast",
        "+ Log Expense": "+ Log Expense",
        "+ Add Income": "+ Add Income",
        "+ Create Budget": "+ Create Budget",
        "+ New Goal": "+ New Goal",
        "+ Add Saving": "+ Add Saving",
        "⚡ Auto-Allocate Balance": "⚡ Auto-Allocate Balance",
        "⚡ Auto-Allocate": "⚡ Auto-Allocate",
        "Save Budget": "Save Budget",
        "Save Preferences": "Save Preferences",
        "View All →": "View All →",
        "Full Report →": "Full Report →",
        "Edit": "Edit",
        "Delete": "Delete",
        "✓ Spend": "✓ Spend",
        "General Preferences": "General Preferences",
        "Full Name": "Full Name",
        "Email Address": "Email Address",
        "Language": "Language",
        "Currency": "Currency",
        "App Appearance Theme": "App Appearance Theme"
    },
    HI: {
        "Overview": "अवलोकन",
        "Dashboard": "डैशबोर्ड",
        "Finance": "वित्त प्रबंधन",
        "Income": "आय / कमाई",
        "Expenses": "खर्चे",
        "Budgets": "बजट",
        "Planning": "वित्तीय योजना",
        "Goals": "लक्ष्य (Goals)",
        "Savings": "बचत (Savings)",
        "Calendar": "कैलेंडर",
        "Analytics & Settings": "विश्लेषण और सेटिंग्स",
        "Reports": "रिपोर्ट्स",
        "Categories": "कैटेगरीज़",
        "Profile": "प्रोफ़ाइल",
        "Settings": "सेटिंग्स",
        "Logout": "लॉगआउट",
        "Personal Account": "व्यक्तिगत खाता",
        "Home": "होम",
        "Expense": "खर्च",
        "Budget": "बजट",
        "More": "मेनू",
        "Available Cash": "उपलब्ध फ्री कैश",
        "Free unreserved balance": "खर्च के लिए उपलब्ध फ्री बैलेंस",
        "Current Balance": "वर्तमान बैंक बैलेंस",
        "Opening + Income - Expenses": "शुरुआती + कुल आय - कुल खर्च",
        "Month Expenses": "इस महीने का खर्च",
        "Current month spending": "चालू माह का कुल खर्च",
        "Total Reserved": "कुल लॉक/रिज़र्व्ड राशि",
        "Budgets + Savings goals": "बजट और सेविंग्स गोल्स में लॉक",
        "Financial Health Score": "वित्तीय स्वास्थ्य स्कोर",
        "Budget Allocation": "बजट आवंटन",
        "Quick Expense Fast-Log": "⚡ 2-सेकंड त्वरित खर्च दर्ज करें",
        "Recent Transactions": "हाल के लेन-देन",
        "Income vs Expense Trend": "मासिक आय बनाम खर्च",
        "Smart Financial Insights": "स्मार्ट वित्तीय सुझाव",
        "Month-End Outflow Forecast": "माह-अंत खर्च अनुमान",
        "+ Log Expense": "+ खर्च दर्ज करें",
        "+ Add Income": "+ आय जोड़ें",
        "+ Create Budget": "+ बजट बनाएं",
        "+ New Goal": "+ नया लक्ष्य",
        "+ Add Saving": "+ बचत जोड़ें",
        "⚡ Auto-Allocate Balance": "⚡ ऑटो-एलोकेट बैलेंस",
        "⚡ Auto-Allocate": "⚡ ऑटो-एलोकेट",
        "Save Budget": "बजट सेव करें",
        "Save Preferences": "सेटिंग्स सेव करें",
        "View All →": "सभी देखें →",
        "Full Report →": "पूरी रिपोर्ट →",
        "Edit": "बदलें",
        "Delete": "हटाएं",
        "✓ Spend": "✓ खर्च करें",
        "General Preferences": "सामान्य प्राथमिकताएं",
        "Full Name": "पूरा नाम",
        "Email Address": "ईमेल पता",
        "Language": "भाषा (Language)",
        "Currency": "मुद्रा (करेंसी)",
        "App Appearance Theme": "ऐप थीम (दिखावट)"
    }
};

function getCurrentLanguage() {
    return localStorage.getItem("pp_language") || "EN";
}

function t(key) {
    const lang = getCurrentLanguage();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.EN;
    return dict[key] || key;
}

function applyLanguage(lang) {
    const activeLang = (lang === "HI" || lang === "hi") ? "HI" : "EN";
    localStorage.setItem("pp_language", activeLang);

    const dict = TRANSLATIONS[activeLang] || TRANSLATIONS.EN;

    // 1. Sidebar section titles
    document.querySelectorAll(".nav-section-title").forEach(el => {
        const text = el.getAttribute("data-orig") || el.textContent.trim();
        if (!el.getAttribute("data-orig")) el.setAttribute("data-orig", text);
        if (dict[text]) el.textContent = dict[text];
    });

    // 2. Sidebar Nav Items
    document.querySelectorAll(".nav-item").forEach(el => {
        const span = el.querySelector("span:not(.nav-icon)");
        if (span) {
            const text = span.getAttribute("data-orig") || span.textContent.trim();
            if (!span.getAttribute("data-orig")) span.setAttribute("data-orig", text);
            if (dict[text]) span.textContent = dict[text];
        }
    });

    // 3. KPI titles & footers
    document.querySelectorAll(".kpi-title, .kpi-footer span").forEach(el => {
        const text = el.getAttribute("data-orig") || el.textContent.trim();
        if (!el.getAttribute("data-orig")) el.setAttribute("data-orig", text);
        if (dict[text]) el.textContent = dict[text];
    });

    // 4. Buttons
    document.querySelectorAll("button, .btn-theme, a.btn-theme").forEach(btn => {
        const text = btn.getAttribute("data-orig") || btn.textContent.trim();
        if (!btn.getAttribute("data-orig")) btn.setAttribute("data-orig", text);
        if (dict[text]) btn.textContent = dict[text];
    });

    // 5. Form labels & Headings
    document.querySelectorAll(".form-label, .user-role").forEach(el => {
        const text = el.getAttribute("data-orig") || el.textContent.trim();
        if (!el.getAttribute("data-orig")) el.setAttribute("data-orig", text);
        if (dict[text]) el.textContent = dict[text];
    });

    // 6. Mobile bottom nav
    document.querySelectorAll(".mobile-bottom-item").forEach(item => {
        const span = item.querySelector("span:not(.mob-icon)");
        if (span) {
            const text = span.getAttribute("data-orig") || span.textContent.trim();
            if (!span.getAttribute("data-orig")) span.setAttribute("data-orig", text);
            if (dict[text]) span.textContent = dict[text];
        }
    });
}

// ===============================
// Modern Toast Notification System
// ===============================
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;

    let icon = "✅";
    if (type === "error") icon = "❌";
    else if (type === "warning") icon = "⚠️";
    else if (type === "info") icon = "ℹ️";

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span style="flex-grow:1;word-break:break-word;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px) scale(0.95)";
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refresh })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.access) {
                localStorage.setItem("access_token", data.access);
                return data.access;
            }
        }
    } catch (e) {
        console.error("Failed to refresh token:", e);
    }

    return null;
}

async function apiRequest(endpoint, options = {}) {
    let token = getAccessToken();

    const headers = {
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
        let response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401 && getRefreshToken()) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                headers["Authorization"] = `Bearer ${newToken}`;
                response = await fetch(url, {
                    ...options,
                    headers
                });
            } else {
                logout();
                return;
            }
        }

        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.detail || data.error || (typeof data === 'object' ? Object.values(data)[0] : "Request failed");
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        throw error;
    }
}

async function populateSidebarUser() {
    const usernameEl = document.getElementById("sidebarUsername");
    const avatarEl = document.getElementById("sidebarAvatar");

    try {
        const profile = await apiRequest("/accounts/profile/");
        const name = profile.full_name || profile.username || "User";
        if (usernameEl) usernameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

        if (profile.language) {
            applyLanguage(profile.language);
        }
        if (profile.theme) {
            applyTheme(profile.theme);
        }
    } catch (e) {
        // silent fallback
    }
}

// ===============================
// PWA Service Worker & Install Prompt
// ===============================
let deferredInstallPrompt = null;

function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('PWA Service Worker registered:', reg.scope))
                .catch(err => console.log('PWA Service Worker registration failed:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        const installBtn = document.getElementById('pwaInstallBtn');
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.onclick = async () => {
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    const { outcome } = await deferredInstallPrompt.userChoice;
                    if (outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                    deferredInstallPrompt = null;
                }
            };
        }
    });
}

// ===============================
// Native Mobile Navigation & Offcanvas Drawer
// ===============================
function initMobileNavigation() {
    const isAuthPage = window.location.pathname.endsWith("login.html") || 
                       window.location.pathname.endsWith("register.html") || 
                       window.location.pathname.endsWith("forgot-password.html") || 
                       window.location.pathname.endsWith("reset-password.html") || 
                       window.location.pathname.endsWith("index.html");
    if (isAuthPage) return;

    const sidebar = document.querySelector(".app-sidebar");
    if (!sidebar) return;

    // 1. Create mobile backdrop
    let backdrop = document.querySelector(".mobile-nav-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "mobile-nav-backdrop";
        document.body.appendChild(backdrop);
    }

    const toggleSidebar = (open) => {
        if (open) {
            sidebar.classList.add("mobile-open");
            backdrop.classList.add("show");
            document.body.style.overflow = "hidden";
        } else {
            sidebar.classList.remove("mobile-open");
            backdrop.classList.remove("show");
            document.body.style.overflow = "";
        }
    };

    backdrop.addEventListener("click", () => toggleSidebar(false));

    // 2. Add close button inside sidebar header if not present
    const sidebarHeader = sidebar.querySelector(".sidebar-header");
    if (sidebarHeader && !sidebarHeader.querySelector(".sidebar-close-btn")) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "sidebar-close-btn";
        closeBtn.style.display = "none";
        closeBtn.innerHTML = "✕";
        closeBtn.onclick = () => toggleSidebar(false);
        sidebarHeader.appendChild(closeBtn);
    }

    // 3. Add Hamburger Button to Topbar if not present
    const topbar = document.querySelector(".app-topbar");
    if (topbar && !topbar.querySelector(".mobile-menu-btn")) {
        const menuBtn = document.createElement("button");
        menuBtn.className = "mobile-menu-btn me-2";
        menuBtn.style.display = "none";
        menuBtn.innerHTML = "☰";
        menuBtn.onclick = () => toggleSidebar(true);
        topbar.prepend(menuBtn);
    }

    // 4. Inject Native Bottom Navigation Bar
    if (!document.querySelector(".mobile-bottom-nav")) {
        const currentPath = window.location.pathname;
        const nav = document.createElement("nav");
        nav.className = "mobile-bottom-nav";

        const items = [
            { href: "dashboard.html", icon: "📊", label: t("Home"), active: currentPath.endsWith("dashboard.html") },
            { href: "expenses.html", icon: "💸", label: t("Expense"), active: currentPath.endsWith("expenses.html") },
            { href: "budgets.html", icon: "🎯", label: t("Budget"), active: currentPath.endsWith("budgets.html") },
            { href: "goals.html", icon: "⭐", label: t("Goals"), active: currentPath.endsWith("goals.html") },
            { href: "#menu", icon: "☰", label: t("More"), isMenu: true }
        ];

        nav.innerHTML = items.map(item => `
            <a href="${item.href}" class="mobile-bottom-item ${item.active ? 'active' : ''}" ${item.isMenu ? 'data-menu="true"' : ''}>
                <span class="mob-icon">${item.icon}</span>
                <span>${item.label}</span>
            </a>
        `).join("");

        document.body.appendChild(nav);

        nav.querySelector('[data-menu="true"]')?.addEventListener("click", (e) => {
            e.preventDefault();
            toggleSidebar(true);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyLanguage(getCurrentLanguage());
    initPWA();
    initMobileNavigation();
    if (getAccessToken() && !window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html") && !window.location.pathname.endsWith("index.html")) {
        populateSidebarUser();
    }
});
