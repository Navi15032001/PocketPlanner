// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingGoalId = null;

const statusBadge = {
    ACTIVE: "badge-indigo",
    COMPLETED: "badge-emerald",
    CANCELLED: "badge-rose"
};

async function loadGoals() {
    try {
        const response = await apiRequest("/goals/");
        const goals = Array.isArray(response) ? response : response.results || [];

        const container = document.getElementById("goalCards");
        container.innerHTML = "";

        if (goals.length === 0) {
            container.innerHTML = `<div class="col-12 text-center text-muted p-5">No savings goals created yet. Click <strong>+ Set New Goal</strong> to begin tracking.</div>`;
            return;
        }

        goals.forEach(goal => {
            const target = Number(goal.target_amount);
            const saved = Number(goal.saved_amount);
            const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
            const badgeClass = statusBadge[goal.status] || "badge-indigo";
            const autoSplit = Number(goal.auto_split_percent || 0);

            const col = document.createElement("div");
            col.className = "col-md-6 col-lg-4";

            col.innerHTML = `
                <div class="surface-card h-100 d-flex flex-column justify-content-between" style="border-top: 4px solid var(--primary);">
                    <div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h4 style="font-size: 17px; margin: 0; font-weight: 700;">${goal.name}</h4>
                            <span class="pill-badge ${badgeClass}">${goal.status}</span>
                        </div>
                        <p class="text-muted" style="font-size: 12.5px; min-height: 20px;">${goal.description || "No description provided."}</p>

                        <div class="my-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">₹${saved.toLocaleString("en-IN")}</span>
                                <span style="font-size: 12px; color: var(--text-muted);">Target: ₹${target.toLocaleString("en-IN")}</span>
                            </div>
                            <div style="height: 8px; background: var(--border); border-radius: 99px; overflow: hidden;">
                                <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, var(--primary), var(--success)); transition: width 0.6s ease;"></div>
                            </div>
                            <div class="text-end mt-1" style="font-size: 11px; font-weight: 700; color: var(--primary);">${percent}% funded</div>
                        </div>

                        <div class="d-flex flex-column gap-1 mb-3 pt-2 border-top" style="font-size: 12px; color: var(--text-muted);">
                            <div>📅 <strong>Deadline:</strong> ${goal.deadline || "No deadline set"}</div>
                            <div>⚡ <strong>Auto-Split:</strong> ${autoSplit > 0 ? `<span class="pill-badge badge-amber" style="padding:1px 6px;">${autoSplit}% of income</span>` : "Disabled"}</div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center gap-2 pt-2 border-top">
                        <button class="btn-theme btn-secondary-theme btn-sm-theme" style="font-size: 11.5px; padding: 4px 8px;" onclick="resetGoalProgress(${goal.id})" title="Reset saved balance back to ₹0">
                            🔄 Reset (₹0)
                        </button>
                        <div class="d-flex gap-2">
                            <button class="btn-theme btn-secondary-theme btn-sm-theme" onclick="editGoal(${goal.id})">Edit</button>
                            <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteGoal(${goal.id})">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    } catch (error) {
        console.error("Failed to load goals:", error);
    }
}

document.getElementById("goalForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const goalData = {
        name: document.getElementById("name").value.trim(),
        target_amount: document.getElementById("target_amount").value,
        deadline: document.getElementById("deadline").value || null,
        priority: document.getElementById("priority").value,
        auto_split_percent: document.getElementById("auto_split_percent").value || 0,
        description: document.getElementById("description").value
    };

    try {
        if (editingGoalId) {
            await apiRequest(`/goals/${editingGoalId}/`, {
                method: "PUT",
                body: JSON.stringify(goalData)
            });
            showToast("Goal updated successfully!", "success");
        } else {
            await apiRequest("/goals/", {
                method: "POST",
                body: JSON.stringify(goalData)
            });
            showToast("New goal set up successfully!", "success");
        }

        editingGoalId = null;
        document.getElementById("goalForm").reset();

        const modal = bootstrap.Modal.getInstance(document.getElementById("goalModal"));
        if (modal) modal.hide();

        await loadGoals();
    } catch (error) {
        console.error("Failed to save goal:", error);
        showToast("Could not save goal. Total auto-split across active goals cannot exceed 100%.", "error");
    }
});

async function resetGoalProgress(id) {
    if (!confirm("Are you sure you want to reset this goal's saved amount back to ₹0?")) return;

    try {
        const res = await apiRequest(`/goals/${id}/reset/`, { method: "POST" });
        showToast(res.detail || "Goal reset to ₹0.", "info");
        await loadGoals();
    } catch (error) {
        console.error("Failed to reset goal:", error);
        showToast("Could not reset goal.", "error");
    }
}

async function editGoal(id) {
    try {
        const goal = await apiRequest(`/goals/${id}/`);
        editingGoalId = id;

        document.getElementById("name").value = goal.name;
        document.getElementById("target_amount").value = goal.target_amount;
        document.getElementById("deadline").value = goal.deadline || "";
        document.getElementById("priority").value = goal.priority;
        document.getElementById("auto_split_percent").value = goal.auto_split_percent || 0;
        document.getElementById("description").value = goal.description || "";

        document.querySelector("#goalModal .modal-title").textContent = "Edit Goal";

        const modal = new bootstrap.Modal(document.getElementById("goalModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load goal:", error);
        showToast("Could not load goal details.", "error");
    }
}

document.getElementById("goalModal")?.addEventListener("show.bs.modal", function () {
    if (!editingGoalId) {
        document.querySelector("#goalModal .modal-title").textContent = "Set New Goal";
        document.getElementById("goalForm").reset();
    }
});

async function deleteGoal(id) {
    if (!confirm("Are you sure you want to delete this goal? Related savings records will be detached.")) return;

    try {
        await apiRequest(`/goals/${id}/`, { method: "DELETE" });
        showToast("Goal deleted.", "info");
        await loadGoals();
    } catch (error) {
        console.error("Failed to delete goal:", error);
        showToast("Could not delete goal.", "error");
    }
}

loadGoals();
