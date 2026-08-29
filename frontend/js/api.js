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
// COMPLETE i18n TRANSLATION ENGINE (HINDI & ENGLISH)
// ===============================
const TRANSLATIONS = {
    EN: {},
    HI: {
        // Navigation & Layout
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

        // Dashboard
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
        "Log a cash outflow in 2 seconds": "2 सेकंड में तुरंत खर्च दर्ज करें",
        "Recent Transactions": "हाल के लेन-देन",
        "Latest cash outflow entries": "हाल ही में किए गए खर्च",
        "Income vs Expense Trend": "मासिक आय बनाम खर्च का रुझान",
        "Monthly cash flow trajectory": "मासिक नकदी प्रवाह का विश्लेषण",
        "Smart Financial Insights": "स्मार्ट वित्तीय सुझाव",
        "Automated recommendations based on balance": "आपके बैलेंस और खर्च के आधार पर स्वचालित सलाह",
        "Month-End Outflow Forecast": "माह-अंत खर्च का अनुमान",
        "Projected run-rate based on daily average": "दैनिक औसत खर्च के आधार पर कुल अनुमान",
        "Amount (₹)": "राशि (₹)",
        "Category": "कैटेगरी",
        "Description (Optional)": "विवरण (वैकल्पिक)",
        "+ Fast Log Expense": "+ तुरंत खर्च दर्ज करें",
        "Coffee / Tea": "☕ चाय / कॉफ़ी",
        "Lunch / Food": "🍱 दोपहर का भोजन",
        "Auto-Ride / Fuel": "⛽ किराया / पेट्रोल",
        "Groceries": "🛒 राशन / किराना",
        "View All →": "सभी देखें →",
        "Full Report →": "पूरी रिपोर्ट →",

        // Health Statuses
        "Healthy & well balanced.": "उत्कृष्ट और संतुलित वित्तीय स्थिति।",
        "Moderate — keep an eye on spending.": "मध्यम — खर्चे पर थोड़ा ध्यान दें।",
        "Tight — high balance allocation.": "कम फ्री बैलेंस — खर्च सीमित रखें।",
        "Critical — cash flow deficit.": "गंभीर स्थिति — खर्च बैलेंस से अधिक है।",
        "Over-allocated — budgets exceed balance.": "अति-आवंटित — बजट कुल बैलेंस से अधिक हैं।",
        "Add opening balance and log entries.": "शुरुआती बैलेंस और प्रविष्टियां दर्ज करें।",

        // Budgets & Attendance Matrix
        "Daily Budget & Expense Matrix": "दैनिक बजट एवं खर्च मैट्रिक्स",
        "Budget Allocator": "बजट आवंटन व प्रबंधन",
        "Track day-to-day spending or skip days to instantly free up unreserved cash.": "रोज़ाना का खर्च ट्रैक करें या छुट्टी के दिन स्किप करके तुरंत फ्री कैश बचाएं।",
        "Active Budgets & Envelopes": "सक्रिय बजट और एनवेलप",
        "Active Budgets": "सक्रिय बजट",
        "Click ✓ Spend to log expense and draw down envelope": "खर्च दर्ज करने और बजट से घटाने के लिए ✓ खर्च पर क्लिक करें",
        "Budget Name": "बजट का नाम",
        "Period": "अवधि",
        "Target Cap": "लक्ष्य सीमा (₹)",
        "Allocated Envelope": "आवंटित राशि",
        "Priority": "प्राथमिकता",
        "Actions": "कार्य",
        "Monthly Summary": "मासिक सारांश",
        "Action": "कार्य",
        "Daily & Monthly Budget Matrix": "दैनिक एवं मासिक बजट मैट्रिक्स",
        "Tap any cell to cycle: 🟢 Spent → 🔘 Skipped → ⚪ Pending": "स्थिति बदलने के लिए किसी भी सेल पर क्लिक करें: 🟢 खर्च हुआ → 🔘 स्किप (बचत) → ⚪ लंबित",
        "Spent (Expense Logged)": "खर्च हुआ (दर्ज)",
        "Skipped (Funds Freed)": "स्किप (पैसे बचे)",
        "Scheduled": "नियोजित",
        "Daily Expense Grid": "📅 दैनिक खर्च ग्रिड",
        "Envelopes List": "📊 एनवेलप सूची",
        "⚡ Daily (Day-by-Day Grid)": "⚡ दैनिक (दिन-वार खर्च ग्रिड)",
        "⚡ Auto-Allocate Balance": "⚡ ऑटो-एलोकेट बैलेंस",
        "⚡ Auto-Allocate": "⚡ ऑटो-एलोकेट",
        "+ Create Budget": "+ बजट बनाएं",
        "Create Budget": "नया बजट बनाएं",
        "Edit Budget": "बजट संपादित करें",
        "Target Amount (₹)": "लक्ष्य राशि (₹)",
        "Budget Period": "बजट की अवधि",
        "High (Funded First)": "उच्च (पहले फंड होगा)",
        "Medium": "मध्यम",
        "Low (Funded Last)": "निम्न (अंत में फंड होगा)",
        "⚡ Daily (Day-by-Day Grid)": "⚡ दैनिक (दिन-वार खर्च ग्रिड)",
        "📅 Monthly (Full Envelope)": "📅 मासिक (पूरा एनवेलप)",
        "🗓️ Weekly": "🗓️ साप्ताहिक",
        "Category (Optional)": "कैटेगरी (वैकल्पिक)",
        "-- Uncategorized --": "-- बिना कैटेगरी --",
        "Save Budget": "बजट सेव करें",
        "Day Action": "दैनिक कार्य",
        "Update budget tracking for this day.": "इस दिन के लिए बजट ट्रैकिंग अपडेट करें।",
        "Mark as Spent": "🟢 खर्च हुआ दर्ज करें",
        "Mark as Skipped (Free": "🔘 स्किप दर्ज करें (पैसे बचाएं",
        "Reset to Scheduled / Pending": "⚪ लंबित / रीसेट करें",
        "✓ Spend": "✓ खर्च करें",
        "✓ Spend / Deduct": "✓ खर्च करें / घटाएं",
        "Edit": "संपादित करें",
        "Delete": "हटाएं",
        "Prev": "पिछला",
        "Next": "अगला",
        "Today": "आज",

        // Expenses
        "Expenses Tracker": "खर्च ट्रैकर",
        "Monitor and manage all historical cash outflows.": "अपने सभी ऐतिहासिक खर्चों की निगरानी और प्रबंधन करें।",
        "Total Outflow": "कुल खर्च",
        "All Expenses Record": "सभी खर्चों का रिकॉर्ड",
        "Log Expense": "खर्च दर्ज करें",
        "+ Log Expense": "+ खर्च दर्ज करें",
        "Import CSV": "CSV आयात करें",
        "Export CSV": "CSV निर्यात करें",
        "Date": "दिनांक",
        "Amount": "राशि",
        "Description": "विवरण",
        "Save Expense": "खर्च सेव करें",

        // Income
        "Income Tracker": "आय / कमाई ट्रैकर",
        "Record salary, freelance earnings, and automatic goal splits.": "वेतन, फ्रीलांस कमाई दर्ज करें और स्वचालित लक्ष्य बचत करें।",
        "Total Inflow": "कुल प्राप्त आय",
        "All Income Streams": "सभी आय के स्रोत",
        "+ Add Income": "+ आय जोड़ें",
        "Add Income": "आय जोड़ें",
        "Title": "शीर्षक / स्रोत",
        "Auto-Split to Goals": "लक्ष्यों में ऑटो-स्प्लिट",
        "Save Income": "आय सेव करें",

        // Goals & Savings
        "Savings Goals": "बचत लक्ष्य",
        "Set financial targets and track auto-split progress.": "वित्तीय लक्ष्य निर्धारित करें और स्वचालित बचत ट्रैक करें।",
        "+ New Goal": "+ नया लक्ष्य",
        "+ Add Saving": "+ बचत जोड़ें",
        "Goal Name": "लक्ष्य का नाम",
        "Target Amount": "लक्ष्य राशि",
        "Saved So Far": "अब तक की बचत",
        "Auto-Split %": "ऑटो-स्प्लिट %",
        "Status": "स्थिति",
        "Active": "सक्रिय",
        "Completed": "पूर्ण",

        // Settings Page
        "Account Settings": "खाता सेटिंग्स",
        "Configure your financial base parameters, theme, and security credentials.": "अपने वित्तीय पैरामीटर, थीम और सुरक्षा सेटिंग्स कॉन्फ़िगर करें।",
        "General Preferences": "सामान्य प्राथमिकताएं",
        "Manage your name, theme, and opening balance.": "अपना नाम, थीम और शुरुआती बैलेंस प्रबंधित करें।",
        "Full Name": "पूरा नाम",
        "Email Address": "ईमेल पता",
        "Starting / Opening Balance (₹)": "शुरुआती / ओपनिंग बैलेंस (₹)",
        "One-time baseline opening balance in your bank/wallet.": "आपके बैंक/वॉलेट का एकमुश्त शुरुआती बेसलाइन बैलेंस।",
        "App Appearance Theme": "ऐप थीम (दिखावट)",
        "Light Theme": "लाइट थीम (दिन)",
        "Dark Theme": "डार्क थीम (रात)",
        "Currency": "मुद्रा (करेंसी)",
        "Language": "भाषा (Language)",
        "Save Preferences": "प्राथमिकताएं सेव करें",
        "Security & Password": "सुरक्षा और पासवर्ड",
        "Ensure your account is protected with a strong password.": "अपने खाते को एक मजबूत पासवर्ड से सुरक्षित रखें।",
        "Current Password": "वर्तमान पासवर्ड",
        "New Password": "नया पासवर्ड",
        "Confirm New Password": "नए पासवर्ड की पुष्टि करें",
        "Change Password": "पासवर्ड बदलें",
        "At least 6 characters": "कम से कम 6 अक्षर",
        "Your full name": "आपका पूरा नाम"
    }
};

function getCurrentLanguage() {
    return localStorage.getItem("pp_language") || "EN";
}

function t(key) {
    const lang = getCurrentLanguage();
    if (lang === "HI" && TRANSLATIONS.HI[key]) {
        return TRANSLATIONS.HI[key];
    }
    return key;
}

function applyLanguage(lang) {
    const activeLang = (lang === "HI" || lang === "hi") ? "HI" : "EN";
    localStorage.setItem("pp_language", activeLang);

    if (activeLang === "EN") {
        document.querySelectorAll("[data-orig-text]").forEach(el => {
            el.textContent = el.getAttribute("data-orig-text");
        });
        document.querySelectorAll("[data-orig-ph]").forEach(el => {
            el.placeholder = el.getAttribute("data-orig-ph");
        });
        return;
    }

    const dict = TRANSLATIONS.HI;

    function translateNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue.trim();
            if (val && dict[val]) {
                if (node.parentElement && !node.parentElement.hasAttribute("data-orig-text")) {
                    node.parentElement.setAttribute("data-orig-text", val);
                }
                node.nodeValue = node.nodeValue.replace(val, dict[val]);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute("placeholder")) {
                const ph = node.getAttribute("placeholder").trim();
                if (dict[ph]) {
                    if (!node.hasAttribute("data-orig-ph")) {
                        node.setAttribute("data-orig-ph", ph);
                    }
                    node.setAttribute("placeholder", dict[ph]);
                }
            }

            if (node.tagName === "OPTION") {
                const optText = node.textContent.trim();
                if (dict[optText]) {
                    if (!node.hasAttribute("data-orig-text")) {
                        node.setAttribute("data-orig-text", optText);
                    }
                    node.textContent = dict[optText];
                }
            }

            for (let child of node.childNodes) {
                translateNode(child);
            }
        }
    }

    if (document.body) {
        translateNode(document.body);
    }
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
