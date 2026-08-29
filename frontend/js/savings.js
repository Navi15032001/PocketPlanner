// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingSavingId = null;

async function loadGoalsDropdown() {
    try {
        const response = await apiRequest("/goals/");
        const goals = Array.isArray(response) ? response : response.results || [];

        const goalSelect = document.getElementById("goal");
        goalSelect.innerHTML = '<option value="">Select target goal</option>';

        goals.forEach(goal => {
            const option = document.createElement("option");
            option.value = goal.id;
            option.textContent = goal.name;
            goalSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load goals:", error);
    }
}

function getGoalName(goalId) {
    const goalSelect = document.getElementById("goal");
    const option = goalSelect ? goalSelect.querySelector(`option[value="${goalId}"]`) : null;
    return option ? option.textContent : "Savings Goal";
}

async function loadSavings() {
    try {
        const response = await apiRequest("/savings/");
        const savings = Array.isArray(response) ? response : response.results || [];

        const tableBody = document.getElementById("savingTableBody");
        tableBody.innerHTML = "";

        let total = 0;

        if (savings.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" class="text-center text-muted p-4">No savings deposits logged yet. Click <strong>+ Log Saving Deposit</strong>.</td></tr>
            `;
        } else {
            savings.forEach(saving => {
                total += parseFloat(saving.amount);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="font-weight:600; color:var(--text-muted);">${saving.date}</td>
                    <td><span class="pill-badge badge-indigo">${getGoalName(saving.goal)}</span></td>
                    <td style="font-weight:800; color:var(--primary); font-size:14.5px;">₹${Number(saving.amount).toLocaleString("en-IN")}</td>
                    <td style="font-weight:500;">${saving.description || "—"}</td>
                    <td style="text-align: right;">
                        <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editSaving(${saving.id})">Edit</button>
                        <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteSaving(${saving.id})">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        document.getElementById("totalSaved").textContent = `₹${total.toLocaleString("en-IN")}`;
    } catch (error) {
        console.error("Failed to load savings:", error);
    }
}

document.getElementById("savingForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const savingData = {
        goal: document.getElementById("goal").value,
        amount: document.getElementById("amount").value,
        date: document.getElementById("date").value,
        description: document.getElementById("description").value
    };

    try {
        if (editingSavingId) {
            await apiRequest(`/savings/${editingSavingId}/`, {
                method: "PUT",
                body: JSON.stringify(savingData)
            });
            showToast("Saving deposit updated!", "success");
        } else {
            await apiRequest("/savings/", {
                method: "POST",
                body: JSON.stringify(savingData)
            });
            showToast("Deposit saved & Goal target updated!", "success");
        }

        editingSavingId = null;
        document.getElementById("savingForm").reset();

        const modal = bootstrap.Modal.getInstance(document.getElementById("savingModal"));
        if (modal) modal.hide();

        await loadSavings();
    } catch (error) {
        console.error("Failed to save saving entry:", error);
        showToast("Could not save deposit. Please check inputs.", "error");
    }
});

async function editSaving(id) {
    try {
        const saving = await apiRequest(`/savings/${id}/`);
        editingSavingId = id;

        document.getElementById("goal").value = saving.goal;
        document.getElementById("amount").value = saving.amount;
        document.getElementById("date").value = saving.date;
        document.getElementById("description").value = saving.description || "";

        document.querySelector("#savingModal .modal-title").textContent = "Edit Saving Deposit";

        const modal = new bootstrap.Modal(document.getElementById("savingModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load saving entry:", error);
        showToast("Could not load saving record details.", "error");
    }
}

document.getElementById("savingModal")?.addEventListener("show.bs.modal", function () {
    if (!editingSavingId) {
        document.querySelector("#savingModal .modal-title").textContent = "Log Saving Deposit";
        document.getElementById("savingForm").reset();
        document.getElementById("date").value = new Date().toISOString().split("T")[0];
    }
});

async function deleteSaving(id) {
    if (!confirm("Are you sure you want to delete this saving entry? It will be deducted from the goal.")) return;

    try {
        await apiRequest(`/savings/${id}/`, { method: "DELETE" });
        showToast("Saving record deleted.", "info");
        await loadSavings();
    } catch (error) {
        console.error("Failed to delete saving:", error);
        showToast("Could not delete saving record.", "error");
    }
}

async function initializePage() {
    await loadGoalsDropdown();
    await loadSavings();
}

initializePage();
