// ===============================
// AUTH CHECK
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

const priorityBadge = {
    HIGH: "badge-rose",
    MEDIUM: "badge-amber",
    LOW: "badge-cyan"
};

async function loadCategoryChart() {
    try {
        const data = await apiRequest("/reports/category-expenses/");
        const canvas = document.getElementById("categoryChart");
        if (!canvas) return;

        if (!data || data.length === 0) {
            canvas.parentElement.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted" style="font-size:13px;">No expense data logged</div>';
            return;
        }

        const labels = data.map(item => item.category || "Uncategorized");
        const values = data.map(item => Number(item.total));

        new Chart(canvas, {
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
                        labels: { boxWidth: 12, font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } }
                    }
                },
                cutout: "65%"
            }
        });
    } catch (error) {
        console.error("Failed to load category chart:", error);
    }
}

async function loadMonthlyChart() {
    try {
        const data = await apiRequest("/reports/monthly/");
        const canvas = document.getElementById("monthlyChart");
        if (!canvas) return;

        if (!data || data.length === 0) {
            canvas.parentElement.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted" style="font-size:13px;">No monthly data logged</div>';
            return;
        }

        const labels = data.map(item => item.month);
        const values = data.map(item => Number(item.expense));

        new Chart(canvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Monthly Outflow",
                    data: values,
                    backgroundColor: "#4f46e5",
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
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
        console.error("Failed to load monthly chart:", error);
    }
}

async function loadSavingsTotal() {
    try {
        const data = await apiRequest("/reports/savings/");
        document.getElementById("totalSavings").textContent =
            `₹${Number(data.total_savings).toLocaleString("en-IN")}`;
    } catch (error) {
        console.error("Failed to load savings total:", error);
    }
}

async function loadBudgetReport() {
    try {
        const data = await apiRequest("/reports/budgets/");
        const tableBody = document.getElementById("budgetReportBody");
        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted p-4">No active budgets yet.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const badgeClass = priorityBadge[item.priority] || "badge-indigo";
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="font-weight:700;">${item.name}</td>
                <td style="font-weight:700; color:var(--primary);">₹${Number(item.allocated_amount).toLocaleString("en-IN")}</td>
                <td style="text-align: right;"><span class="pill-badge ${badgeClass}">${item.priority}</span></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load budget report:", error);
    }
}

// ===============================
// EXPORTS (with auth header)
// ===============================
async function downloadFile(endpoint, filename) {
    try {
        showToast(`Preparing ${filename} download...`, "info");
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${getAccessToken()}` }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast(`${filename} downloaded successfully!`, "success");
    } catch (error) {
        console.error("Export failed:", error);
        showToast("Could not export file. Please try again.", "error");
    }
}

function exportExpensesCSV() {
    downloadFile("/reports/export/expenses/csv/", "expenses.csv");
}

function exportIncomeCSV() {
    downloadFile("/reports/export/income/csv/", "income.csv");
}

function exportMonthlyPDF() {
    downloadFile("/reports/export/monthly/pdf/", "monthly-report.pdf");
}

async function initializePage() {
    await loadCategoryChart();
    await loadMonthlyChart();
    await loadSavingsTotal();
    await loadBudgetReport();
}

initializePage();
