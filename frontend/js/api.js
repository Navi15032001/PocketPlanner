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

// Global Theme Management
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

// Modern Toast Notification System
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

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers: headers
        }
    );

    if (response.status === 401 && !endpoint.includes("/accounts/login/") && !endpoint.includes("/accounts/token/refresh/")) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            headers["Authorization"] = `Bearer ${newToken}`;
            response = await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    ...options,
                    headers: headers
                }
            );
        } else {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html")) {
                window.location.href = "login.html";
            }
            throw new Error("Session expired. Please log in again.");
        }
    }

    if (!response.ok) {
        throw new Error(
            `API Error: ${response.status}`
        );
    }

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

// Auto-load Sidebar User Data if present
async function populateSidebarUser() {
    const usernameEl = document.getElementById("sidebarUsername");
    const avatarEl = document.getElementById("sidebarAvatar");
    if (!usernameEl && !avatarEl) return;

    try {
        const profile = await apiRequest("/accounts/profile/");
        const name = profile.full_name || profile.username || "User";
        if (usernameEl) usernameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
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
            { href: "dashboard.html", icon: "📊", label: "Home", active: currentPath.endsWith("dashboard.html") },
            { href: "expenses.html", icon: "💸", label: "Expense", active: currentPath.endsWith("expenses.html") },
            { href: "budgets.html", icon: "🎯", label: "Budget", active: currentPath.endsWith("budgets.html") },
            { href: "goals.html", icon: "⭐", label: "Goals", active: currentPath.endsWith("goals.html") },
            { href: "#menu", icon: "☰", label: "More", isMenu: true }
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
    initPWA();
    initMobileNavigation();
    if (getAccessToken() && !window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html") && !window.location.pathname.endsWith("index.html")) {
        populateSidebarUser();
    }
});
