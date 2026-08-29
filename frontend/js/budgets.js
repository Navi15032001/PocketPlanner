// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingBudgetId = null;

const priorityBadge = {
    HIGH: "badge-rose",
    MEDIUM: "badge-amber",
    LOW: "badge-cyan"
};

async function loadBudgets() {
    try {
        const response = await apiRequest("/budgets/");
        const budgets = Array.isArray(response) ? response : response.results || [];

        const tableBody = document.getElementById("budgetTableBody");
        tableBody.innerHTML = "";

        if (budgets.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" class="text-center text-muted p-4">No active budgets created yet. Click <strong>+ Create Budget</strong>.</td></tr>
            `;
            return;
        }

        budgets.forEach(budget => {
            const row = document.createElement("tr");
            const badgeClass = priorityBadge[budget.priority] || "badge-indigo";
            const target = Number(budget.target_amount);
            const allocated = Number(budget.allocated_amount);
            const percent = target > 0 ? Math.min(100, Math.round((allocated / target) * 100)) : 0;

            row.innerHTML = `
                <td style="font-weight:700;">${budget.name}</td>
                <td style="font-weight:600;">₹${target.toLocaleString("en-IN")}</td>
                <td>
                    <div style="font-weight:800; color:var(--primary); font-size:14px;">₹${allocated.toLocaleString("en-IN")} (${percent}%)</div>
                    <div style="height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; width: 100px; margin-top: 4px;">
                        <div style="height: 100%; width: ${percent}%; background: var(--primary);"></div>
                    </div>
                </td>
                <td><span class="pill-badge ${badgeClass}">${budget.priority}</span></td>
                <td style="text-align: right;">
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

document.getElementById("budgetForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const budgetData = {
        name: document.getElementById("name").value.trim(),
        target_amount: document.getElementById("target_amount").value,
        priority: document.getElementById("priority").value
    };

    try {
        if (editingBudgetId) {
            await apiRequest(`/budgets/${editingBudgetId}/`, {
                method: "PUT",
                body: JSON.stringify(budgetData)
            });
            showToast("Budget updated!", "success");
        } else {
            await apiRequest("/budgets/", {
                method: "POST",
                body: JSON.stringify(budgetData)
            });
            showToast("Budget created!", "success");
        }

        editingBudgetId = null;
        document.getElementById("budgetForm").reset();

        const modal = bootstrap.Modal.getInstance(document.getElementById("budgetModal"));
        if (modal) modal.hide();

        await loadBudgets();
    } catch (error) {
        console.error("Failed to save budget:", error);
        showToast("Could not save budget. Please check inputs.", "error");
    }
});

async function editBudget(id) {
    try {
        const budget = await apiRequest(`/budgets/${id}/`);
        editingBudgetId = id;

        document.getElementById("name").value = budget.name;
        document.getElementById("target_amount").value = budget.target_amount;
        document.getElementById("priority").value = budget.priority;

        document.querySelector("#budgetModal .modal-title").textContent = "Edit Budget";

        const modal = new bootstrap.Modal(document.getElementById("budgetModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load budget:", error);
        showToast("Could not load budget details.", "error");
    }
}

// Reset modal on open
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

async function allocateBudgets() {
    try {
        const result = await apiRequest("/budgets/allocate/", { method: "POST" });
        showToast(`Allocated ₹${Number(result.allocated).toLocaleString("en-IN")} out of ₹${Number(result.balance).toLocaleString("en-IN")} current balance!`, "success");
        await loadBudgets();
    } catch (error) {
        console.error("Failed to allocate budgets:", error);
        showToast("Could not allocate budgets. Check your available balance.", "error");
    }
}

loadBudgets();
