// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingBudgetId = null;
let currentBudgets = [];

const priorityBadge = {
    HIGH: "badge-rose",
    MEDIUM: "badge-amber",
    LOW: "badge-cyan"
};

const periodBadge = {
    DAILY: { label: "⚡ Daily", class: "badge-amber" },
    WEEKLY: { label: "🗓️ Weekly", class: "badge-cyan" },
    MONTHLY: { label: "📅 Monthly", class: "badge-indigo" }
};

async function loadCategories() {
    try {
        const response = await apiRequest("/categories/");
        const categories = Array.isArray(response) ? response : response.results || [];
        const select = document.getElementById("categorySelect");
        if (!select) return;

        select.innerHTML = `<option value="">-- Uncategorized --</option>`;
        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = `${cat.name} (${cat.type || 'General'})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load categories:", e);
    }
}

async function loadBudgets() {
    try {
        const response = await apiRequest("/budgets/");
        currentBudgets = Array.isArray(response) ? response : response.results || [];

        const tableBody = document.getElementById("budgetTableBody");
        tableBody.innerHTML = "";

        if (currentBudgets.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="6" class="text-center text-muted p-4">No active budgets created yet. Click <strong>+ Create Budget</strong>.</td></tr>
            `;
            return;
        }

        currentBudgets.forEach(budget => {
            const row = document.createElement("tr");
            const badgeClass = priorityBadge[budget.priority] || "badge-indigo";
            const periodInfo = periodBadge[budget.period] || periodBadge.MONTHLY;
            const target = Number(budget.target_amount);
            const allocated = Number(budget.allocated_amount);
            const percent = target > 0 ? Math.min(100, Math.round((allocated / target) * 100)) : 0;

            row.innerHTML = `
                <td>
                    <div style="font-weight:700;">${budget.name}</div>
                    ${budget.category_name ? `<span style="font-size:11px; color:var(--text-muted);">🏷️ ${budget.category_name}</span>` : ''}
                </td>
                <td><span class="pill-badge ${periodInfo.class}">${periodInfo.label}</span></td>
                <td style="font-weight:600;">₹${target.toLocaleString("en-IN")}</td>
                <td>
                    <div style="font-weight:800; color:var(--primary); font-size:14px;">₹${allocated.toLocaleString("en-IN")} (${percent}%)</div>
                    <div style="height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; width: 100px; margin-top: 4px;">
                        <div style="height: 100%; width: ${percent}%; background: var(--primary);"></div>
                    </div>
                </td>
                <td><span class="pill-badge ${badgeClass}">${budget.priority}</span></td>
                <td style="text-align: right;">
                    <button class="btn-theme btn-primary-theme btn-sm-theme me-1" style="padding: 4px 9px; font-size: 11.5px;" onclick="openSpendModal(${budget.id})" title="1-Tap Expense from this Budget">
                        ✓ Spend
                    </button>
                    <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editBudget(${budget.id})">Edit</button>
                    <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteBudget(${budget.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load budgets:", error);
    }
}

// Open 1-Tap Spend Modal
function openSpendModal(budgetId) {
    const budget = currentBudgets.find(b => b.id === budgetId);
    if (!budget) return;

    document.getElementById("spendBudgetId").value = budget.id;
    document.getElementById("spendBudgetName").textContent = budget.name;
    document.getElementById("spendBudgetAvailable").textContent = `₹${Number(budget.allocated_amount).toLocaleString("en-IN")}`;
    
    // Default to remaining allocated or target
    const defaultAmount = Number(budget.allocated_amount) > 0 ? Number(budget.allocated_amount) : Number(budget.target_amount);
    document.getElementById("spendAmount").value = defaultAmount;
    document.getElementById("spendDescription").value = `Spent from budget: ${budget.name}`;

    const modal = new bootstrap.Modal(document.getElementById("spendBudgetModal"));
    modal.show();
}

// Handle 1-Tap Spend Submission
document.getElementById("spendBudgetForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const budgetId = document.getElementById("spendBudgetId").value;
    const amount = document.getElementById("spendAmount").value;
    const description = document.getElementById("spendDescription").value.trim();

    try {
        const response = await apiRequest(`/budgets/${budgetId}/spend/`, {
            method: "POST",
            body: JSON.stringify({ amount, description })
        });

        showToast(response.detail || "Expense logged from budget successfully!", "success");

        const modal = bootstrap.Modal.getInstance(document.getElementById("spendBudgetModal"));
        if (modal) modal.hide();

        await loadBudgets();
    } catch (error) {
        console.error("Failed to spend from budget:", error);
        showToast("Could not log expense from budget.", "error");
    }
});

document.getElementById("budgetForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const budgetData = {
        name: document.getElementById("name").value.trim(),
        target_amount: document.getElementById("target_amount").value,
        priority: document.getElementById("priority").value,
        period: document.getElementById("period").value,
        category: document.getElementById("categorySelect").value || null
    };

    try {
        if (editingBudgetId) {
            await apiRequest(`/budgets/${editingBudgetId}/`, {
                method: "PUT",
                body: JSON.stringify(budgetData)
            });
            showToast("Budget updated successfully!", "success");
        } else {
            await apiRequest("/budgets/", {
                method: "POST",
                body: JSON.stringify(budgetData)
            });
            showToast("New budget created successfully!", "success");
        }

        editingBudgetId = null;
        document.getElementById("budgetForm").reset();

        const modal = bootstrap.Modal.getInstance(document.getElementById("budgetModal"));
        if (modal) modal.hide();

        await loadBudgets();
    } catch (error) {
        console.error("Failed to save budget:", error);
        showToast("Could not save budget. Please check your inputs.", "error");
    }
});

async function allocateBudgets() {
    try {
        const data = await apiRequest("/budgets/allocate/", { method: "POST" });
        const balance = Number(data.balance).toLocaleString("en-IN");
        const allocated = Number(data.allocated).toLocaleString("en-IN");
        const remaining = Number(data.available).toLocaleString("en-IN");

        const messageEl = document.getElementById("allocateMessage");
        messageEl.innerHTML = `
            <div class="surface-card p-3 border-start border-4 border-success d-flex justify-content-between align-items-center">
                <div>
                    <h4 style="font-size:15px; margin:0; font-weight:700;">✅ Priority Allocation Complete</h4>
                    <p style="font-size:12.5px; color:var(--text-muted); margin:2px 0 0;">
                        Allocated <strong>₹${allocated}</strong> from <strong>₹${balance}</strong> balance. Free remaining: <strong>₹${remaining}</strong>.
                    </p>
                </div>
            </div>
        `;

        showToast("Priority allocation complete!", "success");
        await loadBudgets();
    } catch (error) {
        console.error("Failed to allocate budgets:", error);
        showToast("Could not allocate budgets. Please check your balance.", "error");
    }
}

async function editBudget(id) {
    try {
        const budget = await apiRequest(`/budgets/${id}/`);
        editingBudgetId = id;

        document.getElementById("name").value = budget.name;
        document.getElementById("target_amount").value = budget.target_amount;
        document.getElementById("priority").value = budget.priority;
        document.getElementById("period").value = budget.period || "MONTHLY";
        document.getElementById("categorySelect").value = budget.category || "";

        document.querySelector("#budgetModal .modal-title").textContent = "Edit Budget";

        const modal = new bootstrap.Modal(document.getElementById("budgetModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load budget:", error);
        showToast("Could not load budget details.", "error");
    }
}

document.getElementById("budgetModal")?.addEventListener("show.bs.modal", function () {
    if (!editingBudgetId) {
        document.querySelector("#budgetModal .modal-title").textContent = "Create Budget";
        document.getElementById("budgetForm").reset();
    }
});

async function deleteBudget(id) {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    try {
        await apiRequest(`/budgets/${id}/`, { method: "DELETE" });
        showToast("Budget deleted.", "info");
        await loadBudgets();
    } catch (error) {
        console.error("Failed to delete budget:", error);
        showToast("Could not delete budget.", "error");
    }
}

loadCategories();
loadBudgets();
