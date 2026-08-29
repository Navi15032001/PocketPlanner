// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingExpenseId = null;

// ===============================
// LOAD CATEGORIES (Universal Sync)
// ===============================
async function loadCategories() {
    await populateCategorySelect(document.getElementById("category"), null, "Select Category (Optional)");
}

function getCategoryName(categoryId) {
    if (!categoryId) return "Uncategorized";
    const categorySelect = document.getElementById("category");
    const option = categorySelect ? categorySelect.querySelector(`option[value="${categoryId}"]`) : null;
    return option ? option.textContent : "Uncategorized";
}

// ===============================
// LOAD EXPENSES
// ===============================
async function loadExpenses() {
    try {
        const response = await apiRequest("/expenses/");
        const expenses = Array.isArray(response) ? response : response.results || [];
        const tableBody = document.getElementById("expenseTableBody");
        tableBody.innerHTML = "";

        if (expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted p-4">
                        No expenses logged yet. Click <strong>+ Log Expense</strong> or import a CSV.
                    </td>
                </tr>
            `;
            return;
        }

        expenses.forEach(expense => {
            const row = document.createElement("tr");
            const categoryName = expense.category_name || getCategoryName(expense.category);

            row.innerHTML = `
                <td style="font-weight:600; color:var(--text-muted);">${expense.date}</td>
                <td><span class="pill-badge badge-indigo">${categoryName}</span></td>
                <td style="font-weight:600;">${expense.description || "—"}</td>
                <td style="font-weight:800; color:var(--danger); font-size:14.5px;">₹${Number(expense.amount).toLocaleString("en-IN")}</td>
                <td style="text-align: right;">
                    <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editExpense(${expense.id})">Edit</button>
                    <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteExpense(${expense.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load expenses:", error);
    }
}

// ===============================
// LOAD SPENDING SUMMARY
// ===============================
async function loadSummary() {
    try {
        const data = await apiRequest("/expenses/spending-summary/");

        document.getElementById("monthlyIncome").textContent =
            `₹${Number(data.current_balance).toLocaleString("en-IN")}`;

        document.getElementById("totalExpenses").textContent =
            `₹${Number(data.total_expenses).toLocaleString("en-IN")}`;

        document.getElementById("availableMoney").textContent =
            `₹${Number(data.available_money).toLocaleString("en-IN")}`;

    } catch (error) {
        console.error("Failed to load summary:", error);
    }
}

// ===============================
// ADD / UPDATE EXPENSE
// ===============================
document.getElementById("expenseForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const category = document.getElementById("category").value;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;

    const expenseData = {
        category: category || null,
        amount: amount,
        description: description,
        date: date
    };

    try {
        if (editingExpenseId) {
            await apiRequest(`/expenses/${editingExpenseId}/`, {
                method: "PUT",
                body: JSON.stringify(expenseData)
            });
            showToast("Expense updated successfully!", "success");
        } else {
            await apiRequest("/expenses/", {
                method: "POST",
                body: JSON.stringify(expenseData)
            });
            showToast("Expense logged successfully!", "success");
        }

        editingExpenseId = null;
        document.getElementById("expenseForm").reset();

        const modalElement = document.getElementById("expenseModal");
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        await loadExpenses();
        await loadSummary();
    } catch (error) {
        console.error("Failed to save expense:", error);
        showToast("Could not save expense. Please check your inputs.", "error");
    }
});

// ===============================
// EDIT EXPENSE
// ===============================
async function editExpense(id) {
    try {
        const expense = await apiRequest(`/expenses/${id}/`);
        editingExpenseId = id;

        document.getElementById("category").value = expense.category || "";
        document.getElementById("amount").value = expense.amount;
        document.getElementById("description").value = expense.description || "";
        document.getElementById("date").value = expense.date;

        document.querySelector("#expenseModal .modal-title").textContent = "Edit Expense";

        const modal = new bootstrap.Modal(document.getElementById("expenseModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load expense:", error);
        showToast("Could not load expense details.", "error");
    }
}

// Reset modal title on open for new expense
document.getElementById("expenseModal")?.addEventListener("show.bs.modal", function () {
    if (!editingExpenseId) {
        document.querySelector("#expenseModal .modal-title").textContent = "Log Expense";
        document.getElementById("expenseForm").reset();
        // default to today
        document.getElementById("date").value = new Date().toISOString().split("T")[0];
    }
});

// ===============================
// DELETE EXPENSE
// ===============================
async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
        await apiRequest(`/expenses/${id}/`, { method: "DELETE" });
        showToast("Expense deleted.", "info");
        await loadExpenses();
        await loadSummary();
    } catch (error) {
        console.error("Failed to delete expense:", error);
        showToast("Could not delete expense.", "error");
    }
}

// ===============================
// IMPORT CSV
// ===============================
async function importExpensesCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE_URL}/expenses/import-csv/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.detail || "Import failed.", "error");
            return;
        }

        showToast(`Imported ${result.created} expense(s) successfully!`, "success");
        event.target.value = "";
        await loadCategories();
        await loadExpenses();
        await loadSummary();
    } catch (error) {
        console.error("CSV import failed:", error);
        showToast("Could not import CSV file.", "error");
    }
}

async function initializePage() {
    await loadCategories();
    await loadExpenses();
    await loadSummary();
}

initializePage();