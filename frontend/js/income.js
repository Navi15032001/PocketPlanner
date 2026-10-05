// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let editingIncomeId = null;

const typeBadges = {
    SALARY: "badge-emerald",
    FREELANCE: "badge-indigo",
    BUSINESS: "badge-amber",
    BONUS: "badge-purple",
    OTHER: "badge-cyan"
};

async function loadIncome() {
    try {
        const response = await apiRequest("/income/");
        const incomes = Array.isArray(response) ? response : response.results || [];
        // Ensure date-wise descending sorting
        incomes.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

        const tableBody = document.getElementById("incomeTableBody");
        tableBody.innerHTML = "";

        let total = 0;

        if (incomes.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" class="text-center text-muted p-4">No income records logged yet. Click <strong>+ Log Income</strong> or import CSV.</td></tr>
            `;
        } else {
            incomes.forEach(income => {
                total += parseFloat(income.amount);

                // Determine display type name (Custom Type if Other)
                let displayType = income.income_type || "OTHER";
                if (displayType === "OTHER" && income.description) {
                    const match = income.description.match(/\((.*?)\)/);
                    if (match && match[1]) {
                        displayType = match[1].trim();
                    } else if (income.description.trim()) {
                        displayType = income.description.trim();
                    }
                }

                const badgeClass = typeBadges[displayType.toUpperCase()] || "badge-cyan";

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="font-weight:600; color:var(--text-muted);">${income.date}</td>
                    <td style="font-weight:700;">${escapeHtml(income.title)}</td>
                    <td><span class="pill-badge ${badgeClass}">${escapeHtml(displayType)}</span></td>
                    <td style="font-weight:800; color:var(--success); font-size:14.5px;">+₹${Number(income.amount).toLocaleString("en-IN")}</td>
                    <td style="text-align: right;">
                        <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editIncome(${income.id})">Edit</button>
                        <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteIncome(${income.id})">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        document.getElementById("totalIncome").textContent = `₹${total.toLocaleString("en-IN")}`;
    } catch (error) {
        console.error("Failed to load income:", error);
    }
}

function handleIncomeTypeChange() {
    const typeSelect = document.getElementById("income_type");
    const customGroup = document.getElementById("customTypeGroup");
    const customInput = document.getElementById("custom_income_type");

    if (typeSelect.value === "OTHER") {
        customGroup.style.display = "block";
        if (!customInput.value.trim()) {
            customInput.focus();
        }
    } else {
        customGroup.style.display = "none";
        customInput.value = "";
    }
}

document.getElementById("incomeForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    let selectedType = document.getElementById("income_type").value;
    let customVal = "";
    if (selectedType === "OTHER") {
        customVal = document.getElementById("custom_income_type").value.trim();
        if (customVal) {
            selectedType = customVal;
        }
    }

    const incomeData = {
        title: document.getElementById("title").value.trim(),
        income_type: selectedType,
        amount: document.getElementById("amount").value,
        date: document.getElementById("date").value,
        description: document.getElementById("description").value
    };

    try {
        if (editingIncomeId) {
            try {
                await apiRequest(`/income/${editingIncomeId}/`, {
                    method: "PUT",
                    body: JSON.stringify(incomeData)
                });
            } catch (err) {
                if (err.message && err.message.includes("not a valid choice") && selectedType !== "OTHER") {
                    incomeData.income_type = "OTHER";
                    if (customVal && !incomeData.description.includes(customVal)) {
                        incomeData.description = incomeData.description ? `${incomeData.description} (${customVal})` : customVal;
                    }
                    await apiRequest(`/income/${editingIncomeId}/`, {
                        method: "PUT",
                        body: JSON.stringify(incomeData)
                    });
                } else {
                    throw err;
                }
            }
            showToast("Income record updated!", "success");
        } else {
            try {
                await apiRequest("/income/", {
                    method: "POST",
                    body: JSON.stringify(incomeData)
                });
            } catch (err) {
                if (err.message && err.message.includes("not a valid choice") && selectedType !== "OTHER") {
                    incomeData.income_type = "OTHER";
                    if (customVal && !incomeData.description.includes(customVal)) {
                        incomeData.description = incomeData.description ? `${incomeData.description} (${customVal})` : customVal;
                    }
                    await apiRequest("/income/", {
                        method: "POST",
                        body: JSON.stringify(incomeData)
                    });
                } else {
                    throw err;
                }
            }
            showToast("Income logged & Goal auto-splits processed!", "success");
        }

        editingIncomeId = null;
        document.getElementById("incomeForm").reset();
        document.getElementById("customTypeGroup").style.display = "none";
        document.getElementById("custom_income_type").value = "";

        const modal = bootstrap.Modal.getInstance(document.getElementById("incomeModal"));
        if (modal) modal.hide();

        await loadIncome();
    } catch (error) {
        console.error("Failed to save income:", error);
        showToast(error.message || "Could not save income record. Please check inputs.", "error");
    }
});

async function editIncome(id) {
    try {
        const income = await apiRequest(`/income/${id}/`);
        editingIncomeId = id;

        document.getElementById("title").value = income.title;
        
        const standardTypes = ["SALARY", "FREELANCE", "BUSINESS", "BONUS"];
        if (standardTypes.includes(String(income.income_type || "").toUpperCase())) {
            document.getElementById("income_type").value = income.income_type.toUpperCase();
            document.getElementById("customTypeGroup").style.display = "none";
            document.getElementById("custom_income_type").value = "";
        } else {
            document.getElementById("income_type").value = "OTHER";
            document.getElementById("customTypeGroup").style.display = "block";
            
            let customVal = (income.income_type && income.income_type !== "OTHER") ? income.income_type : "";
            if (!customVal && income.description) {
                const match = income.description.match(/\((.*?)\)/);
                if (match && match[1]) {
                    customVal = match[1].trim();
                } else if (income.description.trim()) {
                    customVal = income.description.trim();
                }
            }
            document.getElementById("custom_income_type").value = customVal;
        }

        document.getElementById("amount").value = income.amount;
        document.getElementById("date").value = income.date;
        document.getElementById("description").value = income.description || "";

        document.querySelector("#incomeModal .modal-title").textContent = "Edit Income";

        const modal = new bootstrap.Modal(document.getElementById("incomeModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load income record:", error);
        showToast("Could not load income record details.", "error");
    }
}

// Reset modal on open
document.getElementById("incomeModal")?.addEventListener("show.bs.modal", function () {
    if (!editingIncomeId) {
        document.querySelector("#incomeModal .modal-title").textContent = "Log Income";
        document.getElementById("incomeForm").reset();
        document.getElementById("customTypeGroup").style.display = "none";
        document.getElementById("custom_income_type").value = "";
        document.getElementById("date").value = new Date().toISOString().split("T")[0];
    }
});

async function deleteIncome(id) {
    if (!confirm("Are you sure you want to delete this income record?")) return;

    try {
        await apiRequest(`/income/${id}/`, { method: "DELETE" });
        showToast("Income record deleted.", "info");
        await loadIncome();
    } catch (error) {
        console.error("Failed to delete income:", error);
        showToast("Could not delete income record.", "error");
    }
}

async function importIncomeCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE_URL}/income/import-csv/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.detail || "Import failed.", "error");
            return;
        }

        showToast(`Imported ${result.created} income record(s) successfully!`, "success");
        event.target.value = "";
        await loadIncome();
    } catch (error) {
        console.error("CSV import failed:", error);
        showToast("Could not import CSV file.", "error");
    }
}

loadIncome();
