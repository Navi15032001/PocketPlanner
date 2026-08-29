// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingBudgetId = null;
let currentBudgets = [];
let matrixData = null;

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1; // 1-indexed (1..12)

let activeCellBudget = null;
let activeCellDay = null;

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

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ===============================
// VIEW SWITCHER
// ===============================
function switchView(view) {
    const matrixBtn = document.getElementById("viewMatrixBtn");
    const listBtn = document.getElementById("viewListBtn");
    const matrixContainer = document.getElementById("matrixViewContainer");
    const listContainer = document.getElementById("listViewContainer");

    if (view === "matrix") {
        matrixBtn.classList.add("active");
        listBtn.classList.remove("active");
        matrixContainer.style.display = "block";
        listContainer.style.display = "none";
        loadMatrix();
    } else {
        listBtn.classList.add("active");
        matrixBtn.classList.remove("active");
        listContainer.style.display = "block";
        matrixContainer.style.display = "none";
        loadBudgets();
    }
}

// ===============================
// MONTH NAVIGATOR
// ===============================
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
    } else if (currentMonth < 1) {
        currentMonth = 12;
        currentYear -= 1;
    }
    loadMatrix();
}

function goToTodayMonth() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    loadMatrix();
}

// ===============================
// LOAD MATRIX ATTENDANCE SHEET
// ===============================
async function loadMatrix() {
    try {
        const response = await apiRequest(`/budgets/matrix/?year=${currentYear}&month=${currentMonth}`);
        matrixData = response;

        document.getElementById("currentMonthYearLabel").textContent = `${response.month_name} ${response.year}`;

        const totalDays = response.total_days;
        const matrixRows = response.matrix || [];

        // 1. Build Header
        const header = document.getElementById("matrixHeader");
        let headerHtml = `
            <tr>
                <th class="matrix-sticky-col">Budget Name</th>
                <th style="min-width: 80px;">Period</th>
                <th style="min-width: 90px;">Target</th>
        `;

        for (let day = 1; day <= totalDays; day++) {
            const dateObj = new Date(currentYear, currentMonth - 1, day);
            const dayOfWeek = dayNames[dateObj.getDay()];
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isToday = response.today_day === day;

            headerHtml += `
                <th class="${isToday ? 'cell-today' : ''} ${isWeekend ? 'cell-weekend' : ''}" style="width: 38px;">
                    <div>${day}</div>
                    <div style="font-size: 9px; opacity: 0.7;">${dayOfWeek}</div>
                </th>
            `;
        }

        headerHtml += `
                <th style="min-width: 140px; text-align: left; padding-left: 14px;">Monthly Summary</th>
                <th style="min-width: 80px; text-align: right;">Action</th>
            </tr>
        `;
        header.innerHTML = headerHtml;

        // 2. Build Rows
        const body = document.getElementById("matrixBody");
        body.innerHTML = "";

        if (matrixRows.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="${totalDays + 5}" class="text-center p-5 text-muted">
                        No active budgets created yet. Click <strong>+ Create Budget</strong> to start tracking.
                    </td>
                </tr>
            `;
            return;
        }

        matrixRows.forEach(row => {
            const tr = document.createElement("tr");
            const periodInfo = periodBadge[row.period] || periodBadge.MONTHLY;

            let rowHtml = `
                <td class="matrix-sticky-col">
                    <div style="font-weight: 700;">${row.name}</div>
                    ${row.category_name ? `<span style="font-size:11px; color:var(--text-muted);">🏷️ ${row.category_name}</span>` : ''}
                </td>
                <td><span class="pill-badge ${periodInfo.class}">${periodInfo.label}</span></td>
                <td style="font-weight: 700;">₹${Number(row.target_amount).toLocaleString("en-IN")}</td>
            `;

            if (row.period === "DAILY") {
                // Render 1..31 day interactive cells
                for (let day = 1; day <= totalDays; day++) {
                    const dayData = (row.cells && row.cells[String(day)]) || { status: 'PENDING' };
                    const isToday = response.today_day === day;

                    let cellClass = "cell-pending";
                    let icon = "-";
                    let tooltip = `Day ${day}: Scheduled ₹${row.target_amount}`;

                    if (dayData.status === "SPENT") {
                        cellClass = "cell-spent";
                        icon = "✓";
                        tooltip = `Day ${day}: Spent ₹${dayData.amount || row.target_amount}`;
                    } else if (dayData.status === "SKIPPED") {
                        cellClass = "cell-skipped";
                        icon = "✕";
                        tooltip = `Day ${day}: Skipped (Funds Freed)`;
                    }

                    rowHtml += `
                        <td class="matrix-cell ${cellClass} ${isToday ? 'cell-today' : ''}" 
                            title="${tooltip}" 
                            onclick="openCellActionModal(${row.id}, ${day}, '${dayData.status}', ${row.target_amount})">
                            ${icon}
                        </td>
                    `;
                }

                // Summary Column
                rowHtml += `
                    <td style="text-align: left; padding-left: 14px;">
                        <div style="font-size: 11.5px;">
                            <span style="color: var(--success-text); font-weight: 700;">🟢 ${row.spent_days_count}d Spent (₹${row.total_spent.toLocaleString("en-IN")})</span>
                            <br>
                            <span style="color: var(--danger-text); font-weight: 700;">🔘 ${row.skipped_days_count}d Skipped (₹${row.total_skipped.toLocaleString("en-IN")})</span>
                        </div>
                    </td>
                `;
            } else {
                // MONTHLY or WEEKLY: Single unified monthly span
                const allocated = Number(row.allocated_amount);
                const target = Number(row.target_amount);
                const percent = target > 0 ? Math.min(100, Math.round((allocated / target) * 100)) : 0;

                rowHtml += `
                    <td colspan="${totalDays}" class="monthly-span-cell">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span style="font-weight: 800; color: var(--primary);">📅 Full Month Envelope: ₹${target.toLocaleString("en-IN")}</span>
                                <div style="font-size: 11.5px; color: var(--text-muted);">Allocated: ₹${allocated.toLocaleString("en-IN")} (${percent}%)</div>
                            </div>
                            <button class="btn-theme btn-primary-theme btn-sm-theme" style="padding: 4px 10px; font-size: 11.5px;" onclick="spendMonthlyBudget(${row.id})">
                                ✓ Spend / Deduct
                            </button>
                        </div>
                    </td>
                    <td style="text-align: left; padding-left: 14px;">
                        <span style="font-weight: 700; color: var(--primary);">₹${allocated.toLocaleString("en-IN")} / ₹${target.toLocaleString("en-IN")}</span>
                    </td>
                `;
            }

            rowHtml += `
                <td style="text-align: right;">
                    <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editBudget(${row.id})">Edit</button>
                    <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteBudget(${row.id})">Delete</button>
                </td>
            `;

            tr.innerHTML = rowHtml;
            body.appendChild(tr);
        });

        applyLanguage(getCurrentLanguage());
    } catch (error) {
        console.error("Failed to load matrix:", error);
    }
}

// ===============================
// CELL ACTION MODAL & TOGGLE
// ===============================
function openCellActionModal(budgetId, day, currentStatus, targetAmount) {
    const budget = matrixData.matrix.find(b => b.id === budgetId);
    if (!budget) return;

    activeCellBudget = budget;
    activeCellDay = day;

    const formattedDate = `${matrixData.month_name} ${day}, ${matrixData.year}`;
    document.getElementById("cellActionTitle").textContent = `${budget.name} - ${formattedDate}`;
    document.getElementById("cellSpendAmount").textContent = Number(targetAmount).toLocaleString("en-IN");
    document.getElementById("cellSkipAmount").textContent = Number(targetAmount).toLocaleString("en-IN");

    const modal = new bootstrap.Modal(document.getElementById("cellActionModal"));
    modal.show();
}

async function applyCellAction(newStatus) {
    if (!activeCellBudget || !activeCellDay) return;

    const formattedMonth = String(currentMonth).padStart(2, '0');
    const formattedDay = String(activeCellDay).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    try {
        const response = await apiRequest(`/budgets/${activeCellBudget.id}/cell-toggle/`, {
            method: "POST",
            body: JSON.stringify({
                date: dateStr,
                status: newStatus,
                amount: activeCellBudget.target_amount
            })
        });

        showToast(response.detail || `Day ${activeCellDay} updated to ${newStatus}.`, "success");

        const modal = bootstrap.Modal.getInstance(document.getElementById("cellActionModal"));
        if (modal) modal.hide();

        await loadMatrix();
    } catch (error) {
        console.error("Failed to update cell:", error);
        showToast("Could not update budget day.", "error");
    }
}

async function spendMonthlyBudget(budgetId) {
    const budget = matrixData.matrix.find(b => b.id === budgetId);
    if (!budget) return;

    const amount = prompt(`Enter amount to spend from '${budget.name}' budget:`, budget.allocated_amount || budget.target_amount);
    if (!amount) return;

    try {
        const response = await apiRequest(`/budgets/${budgetId}/spend/`, {
            method: "POST",
            body: JSON.stringify({ amount: Number(amount) })
        });
        showToast(response.detail || "Expense logged from budget.", "success");
        await loadMatrix();
    } catch (e) {
        showToast("Could not spend from budget.", "error");
    }
}

// ===============================
// TRADITIONAL BUDGET CRUD
// ===============================
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

        await loadMatrix();
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
        await loadMatrix();
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
        document.getElementById("period").value = budget.period || "DAILY";
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
        await loadMatrix();
        await loadBudgets();
    } catch (error) {
        console.error("Failed to delete budget:", error);
        showToast("Could not delete budget.", "error");
    }
}

loadCategories();
loadMatrix();
