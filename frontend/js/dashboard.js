// ===============================
// CHECK LOGIN & AUTH
// ===============================
const accessToken = localStorage.getItem("access_token");

if (!accessToken) {
    window.location.href = "login.html";
}

// ===============================
// LOAD GREETING
// ===============================
async function loadGreeting() {
    try {
        const profile = await apiRequest("/accounts/profile/");
        const name = profile.full_name || profile.username;
        const greetingEl = document.getElementById("greetingText");
        if (greetingEl) {
            greetingEl.textContent = `Welcome back, ${name}! 👋`;
        }
    } catch (error) {
        console.error("Failed to load greeting:", error);
    }
}

// ===============================
// LOAD DASHBOARD (summary cards + health face)
// ===============================
const healthDisplay = {
    HEALTHY: { face: "🟢", text: "Healthy & well balanced.", width: 95 },
    MODERATE: { face: "🟡", text: "Moderate — keep an eye on spending.", width: 65 },
    LOW: { face: "🟠", text: "Tight — high balance allocation.", width: 35 },
    CRITICAL: { face: "🔴", text: "Critical — cash flow deficit.", width: 15 },
    OVER_ALLOCATED: { face: "⚠️", text: "Over-allocated — budgets exceed balance.", width: 20 },
    NO_DATA: { face: "⚪", text: "Add opening balance and log entries.", width: 5 },
};

async function loadDashboard() {
    try {
        const data = await apiRequest("/dashboard/");

        document.getElementById("monthlyIncome").textContent =
            `₹${Number(data.current_balance).toLocaleString("en-IN")}`;

        document.getElementById("reservedAmount").textContent =
            `₹${Number(data.reserved_amount).toLocaleString("en-IN")}`;

        document.getElementById("totalExpenses").textContent =
            `₹${Number(data.expenses_this_month).toLocaleString("en-IN")}`;

        document.getElementById("availableMoney").textContent =
            `₹${Number(data.available_money).toLocaleString("en-IN")}`;

        document.getElementById("budgetCount").textContent = data.budget_count;
        document.getElementById("expenseCount").textContent = data.expense_count;

        const health = healthDisplay[data.financial_health] || healthDisplay.NO_DATA;
        document.getElementById("financialHealth").textContent = data.financial_health.replace(/_/g, " ");
        document.getElementById("healthFace").textContent = health.face;
        document.getElementById("healthText").textContent = health.text;
        document.getElementById("healthProgress").style.width = `${health.width}%`;

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

// ===============================
// QUICK EXPENSE FAST-LOG & SHORTCUTS ENGINE
// ===============================
let categoriesList = [];

const DEFAULT_PRESETS = [
    { icon: "☕", name: "Chai", amount: 50, categoryName: "Food & Dining" },
    { icon: "🍔", name: "Food", amount: 200, categoryName: "Food & Dining" },
    { icon: "⛽", name: "Fuel", amount: 500, categoryName: "Transport & Fuel" },
    { icon: "🛒", name: "Grocery", amount: 1000, categoryName: "Groceries" }
];

function getQuickPresets() {
    try {
        const saved = localStorage.getItem("pp_quick_presets");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return DEFAULT_PRESETS;
}

function renderQuickPresets() {
    const container = document.getElementById("quickPresetsContainer");
    if (!container) return;

    const presets = getQuickPresets();
    container.innerHTML = presets.map((p) => `
        <button type="button" class="btn-theme btn-secondary-theme btn-sm-theme" onclick="quickLogPreset(${p.amount}, '${(p.name || 'Expense').replace(/'/g, "\\'")}', '${(p.categoryName || '').replace(/'/g, "\\'")}')" style="font-size: 12px; padding: 4px 10px;">
            ${p.icon || '⚡'} ₹${Number(p.amount).toLocaleString('en-IN')} ${p.name}
        </button>
    `).join("");
}

function openShortcutsModal() {
    const container = document.getElementById("shortcutsListContainer");
    if (!container) return;

    const presets = getQuickPresets();
    container.innerHTML = "";

    presets.forEach((p, idx) => {
        container.appendChild(createShortcutRowElement(p, idx));
    });

    const modal = new bootstrap.Modal(document.getElementById("shortcutsModal"));
    modal.show();
}

function createShortcutRowElement(p = { icon: "⚡", name: "", amount: "", categoryName: "" }, idx = 0) {
    const row = document.createElement("div");
    row.className = "d-flex flex-wrap align-items-center gap-2 p-2 border rounded shortcut-row";
    row.style.background = "var(--bg-body)";
    row.style.borderColor = "var(--border)";

    const catOptions = categoriesList.map(c => `
        <option value="${c.name}" ${c.name.toLowerCase() === (p.categoryName || '').toLowerCase() ? 'selected' : ''}>${c.name}</option>
    `).join("");

    row.innerHTML = `
        <div style="width: 50px;">
            <input type="text" class="form-control-theme text-center shortcut-icon" value="${p.icon || '⚡'}" maxlength="4" placeholder="Icon" style="padding: 6px 4px; font-size: 14px;">
        </div>
        <div style="flex: 2 1 120px;">
            <input type="text" class="form-control-theme shortcut-name" value="${p.name || ''}" placeholder="Name (e.g. Chai, Milk)" style="padding: 6px 10px; font-size: 13px;" required>
        </div>
        <div style="flex: 1.5 1 90px;">
            <input type="number" class="form-control-theme shortcut-amount" value="${p.amount || ''}" placeholder="₹ Amount" min="0.01" step="0.01" style="padding: 6px 10px; font-size: 13px;" required>
        </div>
        <div style="flex: 2 1 130px;">
            <select class="form-control-theme shortcut-category" style="padding: 6px 10px; font-size: 13px;">
                <option value="">Category (Optional)</option>
                ${catOptions}
            </select>
        </div>
        <div>
            <button type="button" class="btn-theme btn-danger-theme btn-sm-theme p-1 px-2" onclick="this.closest('.shortcut-row').remove()" title="Remove Shortcut">
                🗑️
            </button>
        </div>
    `;
    return row;
}

function addShortcutRow() {
    const container = document.getElementById("shortcutsListContainer");
    if (!container) return;
    container.appendChild(createShortcutRowElement({ icon: "⚡", name: "", amount: 100, categoryName: "" }, container.children.length));
}

function saveCustomShortcuts() {
    const container = document.getElementById("shortcutsListContainer");
    if (!container) return;

    const rows = container.querySelectorAll(".shortcut-row");
    const newPresets = [];

    rows.forEach(row => {
        const icon = row.querySelector(".shortcut-icon").value.trim() || "⚡";
        const name = row.querySelector(".shortcut-name").value.trim();
        const amount = parseFloat(row.querySelector(".shortcut-amount").value);
        const categoryName = row.querySelector(".shortcut-category").value;

        if (name && !isNaN(amount) && amount > 0) {
            newPresets.push({ icon, name, amount, categoryName });
        }
    });

    if (newPresets.length === 0) {
        showToast("Please add at least one valid shortcut.", "warning");
        return;
    }

    localStorage.setItem("pp_quick_presets", JSON.stringify(newPresets));
    renderQuickPresets();

    const modal = bootstrap.Modal.getInstance(document.getElementById("shortcutsModal"));
    if (modal) modal.hide();

    showToast("Fast-Log shortcuts updated successfully!", "success");
}

function resetDefaultShortcuts() {
    if (!confirm("Reset shortcuts back to defaults?")) return;
    localStorage.removeItem("pp_quick_presets");
    renderQuickPresets();
    openShortcutsModal();
    showToast("Shortcuts reset to defaults.", "info");
}

async function loadQuickCategories() {
    categoriesList = await getGlobalCategories();
    const select = document.getElementById("quickCategorySelect");
    if (select) {
        await populateCategorySelect(select, null, "Category (Optional)");
    }
    renderQuickPresets();
}

async function quickLogPreset(amount, description, defaultCategoryName = "Food & Dining") {
    const today = new Date().toISOString().split("T")[0];
    let matchedCategory = categoriesList.find(c => defaultCategoryName && c.name.toLowerCase().includes(defaultCategoryName.toLowerCase()));

    try {
        await apiRequest("/expenses/", {
            method: "POST",
            body: JSON.stringify({
                amount: amount,
                description: description,
                category: matchedCategory ? matchedCategory.id : null,
                date: today
            })
        });

        showToast(`⚡ Logged ₹${amount} for ${description}!`, "success");

        // Real-time metrics refresh
        await Promise.all([
            loadDashboard(),
            loadRecentTransactions(),
            loadCategoryChart(),
            loadSmartInsights()
        ]);
    } catch (error) {
        console.error("Quick log error:", error);
        showToast("Failed to log quick expense.", "error");
    }
}

async function handleQuickLogForm(e) {
    e.preventDefault();
    const amountInput = document.getElementById("quickAmount");
    const descInput = document.getElementById("quickDesc");
    const categorySelect = document.getElementById("quickCategorySelect");

    const amount = parseFloat(amountInput.value);
    const description = descInput.value.trim() || "Quick Expense";
    const category = categorySelect.value || null;
    const today = new Date().toISOString().split("T")[0];

    if (!amount || amount <= 0) {
        showToast("Please enter a valid amount.", "warning");
        return;
    }

    try {
        await apiRequest("/expenses/", {
            method: "POST",
            body: JSON.stringify({
                amount: amount,
                description: description,
                category: category,
                date: today
            })
        });

        amountInput.value = "";
        descInput.value = "";
        if (categorySelect) categorySelect.value = "";

        showToast(`⚡ Logged ₹${amount} successfully!`, "success");

        await Promise.all([
            loadDashboard(),
            loadRecentTransactions(),
            loadCategoryChart(),
            loadSmartInsights()
        ]);
    } catch (error) {
        console.error("Quick custom log error:", error);
        showToast("Failed to log expense.", "error");
    }
}

// ===============================
// LOAD SMART INSIGHTS
// ===============================
async function loadSmartInsights() {
    try {
        const [health, suggestions, forecast] = await Promise.all([
            apiRequest("/smartfinance/health-score/"),
            apiRequest("/smartfinance/suggestions/"),
            apiRequest("/smartfinance/forecast/"),
        ]);

        const scoreEl = document.getElementById("smartScoreText");
        if (scoreEl) {
            scoreEl.textContent = `Score: ${health.score}/100`;
        }

        const list = document.getElementById("smartSuggestions");
        if (list) {
            list.innerHTML = suggestions.map(
                (s) => `
                <div class="p-2 d-flex align-items-start gap-2" style="background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px;">
                    <span style="font-size: 15px; line-height: 1.2;">💡</span>
                    <span style="flex-grow: 1; color: var(--text-main); font-weight: 500;">${s}</span>
                </div>`
            ).join("");
        }

        const forecastEl = document.getElementById("forecastText");
        if (forecastEl) {
            forecastEl.textContent =
                `Projected ₹${Number(forecast.projected_month_total).toLocaleString("en-IN")} ` +
                `by month end (₹${Number(forecast.spent_so_far).toLocaleString("en-IN")} spent so far).`;
        }

    } catch (error) {
        console.error("Failed to load smart insights:", error);
    }
}

// ===============================
// LOAD SPENDING BY CATEGORY (real data)
// ===============================
let categoryChartInstance = null;

async function loadCategoryChart() {
    try {
        const data = await apiRequest("/reports/category-expenses/");
        const canvas = document.getElementById("spendingChart");
        if (!canvas) return;

        if (!data || data.length === 0) {
            canvas.parentElement.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted" style="font-size:13px;">No expense data logged yet</div>';
            return;
        }

        const labels = data.map(item => item.category || "Uncategorized");
        const values = data.map(item => Number(item.total));

        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }

        categoryChartInstance = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#4f46e5",
                        "#10b981",
                        "#f59e0b",
                        "#06b6d4",
                        "#8b5cf6",
                        "#ec4899",
                        "#64748b"
                    ],
                    borderWidth: 2,
                    borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
                        }
                    }
                },
                cutout: "68%"
            }
        });
    } catch (error) {
        console.error("Failed to load category chart:", error);
    }
}

// ===============================
// LOAD MONTHLY TREND
// ===============================
function monthLabel(yyyymm) {
    const [year, month] = yyyymm.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short" });
}

let monthlyTrendChartInstance = null;

async function loadMonthlyTrend() {
    try {
        const [expenseMonthly, incomeList] = await Promise.all([
            apiRequest("/reports/monthly/"),
            apiRequest("/income/"),
        ]);

        const canvas = document.getElementById("monthlyTrendChart");
        if (!canvas) return;

        const incomeByMonth = {};
        (Array.isArray(incomeList) ? incomeList : incomeList.results || []).forEach(item => {
            const month = item.date.slice(0, 7);
            incomeByMonth[month] = (incomeByMonth[month] || 0) + parseFloat(item.amount);
        });

        const expenseByMonth = {};
        expenseMonthly.forEach(item => {
            expenseByMonth[item.month] = parseFloat(item.expense);
        });

        const allMonths = Array.from(
            new Set([...Object.keys(expenseByMonth), ...Object.keys(incomeByMonth)])
        ).sort();

        if (allMonths.length === 0) {
            canvas.parentElement.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted" style="font-size:13px;">Not enough historical cash flow data</div>';
            return;
        }

        const labels = allMonths.map(monthLabel);
        const incomeData = allMonths.map(m => incomeByMonth[m] || 0);
        const expenseData = allMonths.map(m => expenseByMonth[m] || 0);

        if (monthlyTrendChartInstance) {
            monthlyTrendChartInstance.destroy();
        }

        monthlyTrendChartInstance = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Income",
                        data: incomeData,
                        tension: 0.35,
                        borderWidth: 2.5,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.08)",
                        fill: true
                    },
                    {
                        label: "Expenses",
                        data: expenseData,
                        tension: 0.35,
                        borderWidth: 2.5,
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(148, 163, 184, 0.1)" }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Failed to load monthly trend:", error);
    }
}

// ===============================
// LOAD RECENT TRANSACTIONS
// ===============================
function formatRelativeDate(dateStr) {
    const today = new Date();
    const date = new Date(dateStr);
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return dateStr;
}

async function loadRecentTransactions() {
    try {
        const response = await apiRequest("/expenses/");
        const expenses = Array.isArray(response) ? response : response.results || [];

        const list = document.getElementById("recentTransactions");
        if (!list) return;

        if (expenses.length === 0) {
            list.innerHTML = '<div class="text-muted p-3 text-center" style="font-size:13px;">No recent transactions recorded</div>';
            return;
        }

        const recent = expenses.slice(0, 5);

        list.innerHTML = recent.map(exp => `
            <div class="d-flex align-items-center justify-content-between p-2" style="border-bottom: 1px solid var(--border-light);">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-icon-badge badge-rose" style="width:34px;height:34px;font-size:15px;">💸</div>
                    <div>
                        <div class="fw-bold" style="font-size: 13.5px; color: var(--text-main);">${exp.description || exp.category_name || "Expense"}</div>
                        <div class="text-muted" style="font-size: 11.5px;">${formatRelativeDate(exp.date)} · <span class="pill-badge badge-indigo" style="font-size:10px;padding:1px 6px;">${exp.category_name || "Uncategorized"}</span></div>
                    </div>
                </div>
                <div class="fw-bold" style="font-size: 14px; color: var(--danger);">
                    -₹${Number(exp.amount).toLocaleString("en-IN")}
                </div>
            </div>
        `).join("");
    } catch (error) {
        console.error("Failed to load recent transactions:", error);
    }
}

// ===============================
// STARTUP FLOW
// ===============================
async function initDashboardFlow() {
    const quickForm = document.getElementById("quickLogForm");
    if (quickForm && !quickForm.hasAttribute("data-wired")) {
        quickForm.setAttribute("data-wired", "true");
        quickForm.addEventListener("submit", handleQuickLogForm);
    }

    await Promise.all([
        loadQuickCategories(),
        loadDashboard(),
        loadSmartInsights(),
        loadGreeting(),
        loadCategoryChart(),
        loadMonthlyTrend(),
        loadRecentTransactions()
    ]);

    applyLanguage(getCurrentLanguage());
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardFlow);
} else {
    initDashboardFlow();
}
