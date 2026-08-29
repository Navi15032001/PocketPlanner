// ===============================
// AUTH CHECK & CATEGORIES CONTROLLER
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

let editingCategoryId = null;

function renderCategoryRows(categories) {
    const tableBody = document.getElementById("categoryTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (categories.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="3" class="text-center text-muted p-4">No custom categories created yet. Click <strong>+ Add Category</strong>.</td></tr>
        `;
        return;
    }

    categories.forEach(category => {
        const row = document.createElement("tr");
        const created = category.created_at ? new Date(category.created_at).toLocaleDateString("en-IN") : "Default";

        row.innerHTML = `
            <td><span class="pill-badge badge-indigo" style="font-size:13px; font-weight:700;">🏷️ ${category.name}</span></td>
            <td style="color: var(--text-muted); font-size:13px;">${created}</td>
            <td style="text-align: right;">
                <button class="btn-theme btn-secondary-theme btn-sm-theme me-1" onclick="editCategory(${category.id})">Edit</button>
                <button class="btn-theme btn-danger-theme btn-sm-theme" onclick="deleteCategory(${category.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadCategories() {
    try {
        const response = await apiRequest("/categories/");
        let categories = Array.isArray(response) ? response : response.results || [];

        if (categories.length === 0) {
            // Auto-trigger seeding on backend
            try {
                await apiRequest("/categories/seed/", { method: "POST" });
                const seeded = await apiRequest("/categories/");
                categories = Array.isArray(seeded) ? seeded : seeded.results || [];
            } catch (e) {
                console.warn("Could not seed categories automatically:", e);
            }
        }

        renderCategoryRows(categories);
        applyLanguage(getCurrentLanguage());
    } catch (error) {
        console.error("Failed to load categories:", error);
    }
}

document.getElementById("categoryForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();

    try {
        if (editingCategoryId) {
            await apiRequest(`/categories/${editingCategoryId}/`, {
                method: "PUT",
                body: JSON.stringify({ name: name })
            });
            showToast("Category updated!", "success");
        } else {
            await apiRequest("/categories/", {
                method: "POST",
                body: JSON.stringify({ name: name })
            });
            showToast("Category created!", "success");
        }

        editingCategoryId = null;
        document.getElementById("categoryForm").reset();

        const modal = bootstrap.Modal.getInstance(document.getElementById("categoryModal"));
        if (modal) modal.hide();

        await loadCategories();
    } catch (error) {
        console.error("Failed to save category:", error);
        showToast("Could not save category. Name might already exist.", "error");
    }
});

async function editCategory(id) {
    try {
        const category = await apiRequest(`/categories/${id}/`);
        editingCategoryId = id;

        document.getElementById("name").value = category.name;
        document.querySelector("#categoryModal .modal-title").textContent = "Edit Category";

        const modal = new bootstrap.Modal(document.getElementById("categoryModal"));
        modal.show();
    } catch (error) {
        console.error("Failed to load category:", error);
        showToast("Could not load category details.", "error");
    }
}

document.getElementById("categoryModal")?.addEventListener("show.bs.modal", function () {
    if (!editingCategoryId) {
        document.querySelector("#categoryModal .modal-title").textContent = "Add Category";
        document.getElementById("categoryForm").reset();
    }
});

async function deleteCategory(id) {
    if (!confirm("Delete this category? Expenses using it will become Uncategorized.")) return;

    try {
        await apiRequest(`/categories/${id}/`, { method: "DELETE" });
        showToast("Category deleted.", "info");
        await loadCategories();
    } catch (error) {
        console.error("Failed to delete category:", error);
        showToast("Could not delete category.", "error");
    }
}

loadCategories();
