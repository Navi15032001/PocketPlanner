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
// EXPORTS & EXECUTIVE PDF GENERATOR
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

async function exportMonthlyPDF() {
    try {
        showToast("Generating Executive Financial Statement PDF...", "info");

        // Fetch live account data in parallel
        const [summary, catExpenses, budgetData, goalsData, expensesData, profile] = await Promise.all([
            apiRequest("/dashboard/summary/").catch(() => ({})),
            apiRequest("/reports/category-expenses/").catch(() => []),
            apiRequest("/reports/budgets/").catch(() => []),
            apiRequest("/goals/").catch(() => []),
            apiRequest("/expenses/").catch(() => []),
            apiRequest("/accounts/profile/").catch(() => ({}))
        ]);

        const availableCash = Number(summary.available_cash || 0).toLocaleString("en-IN");
        const currentBalance = Number(summary.current_balance || 0).toLocaleString("en-IN");
        const monthExpenses = Number(summary.current_month_expenses || summary.month_expenses || 0).toLocaleString("en-IN");
        const totalReserved = Number(summary.total_reserved || 0).toLocaleString("en-IN");
        const healthScore = summary.health_score || 100;
        const healthLabel = summary.health_label || "HEALTHY";

        const username = profile.username || "Personal Account";
        const email = profile.email || "";
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const monthStr = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const reportId = `#PP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

        const catRows = (Array.isArray(catExpenses) && catExpenses.length > 0)
            ? catExpenses.map(c => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">🏷️ ${c.category || 'Uncategorized'}</td>
                    <td style="padding: 7px 10px; font-weight: 700; color: #4f46e5;">₹${Number(c.total || 0).toLocaleString("en-IN")}</td>
                    <td style="padding: 7px 10px; color: #64748b;">${c.share_percent ? c.share_percent + '%' : '—'}</td>
                    <td style="padding: 7px 10px; color: #10b981; font-weight: 600;">Standard</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" style="padding: 10px; text-align: center; color: #94a3b8;">No expense categories logged yet.</td></tr>`;

        const goalsList = Array.isArray(goalsData) ? goalsData : goalsData.results || [];
        const budgetsList = Array.isArray(budgetData) ? budgetData : [];

        const planRows = [];
        budgetsList.slice(0, 4).forEach(b => {
            planRows.push(`
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">🎯 ${b.name} <span style="font-size: 11px; color: #64748b;">(${b.period || 'Budget'})</span></td>
                    <td style="padding: 7px 10px; color: #64748b;">Target: ₹${Number(b.target_amount || b.allocated_amount || 0).toLocaleString("en-IN")}</td>
                    <td style="padding: 7px 10px; font-weight: 700; color: #4f46e5;">₹${Number(b.allocated_amount || 0).toLocaleString("en-IN")}</td>
                    <td style="padding: 7px 10px;"><span style="background: #eef2ff; color: #4f46e5; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">${b.priority || 'Medium'}</span></td>
                </tr>
            `);
        });

        goalsList.slice(0, 4).forEach(g => {
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0;
            planRows.push(`
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">⭐ ${g.name} <span style="font-size: 11px; color: #64748b;">(Goal)</span></td>
                    <td style="padding: 7px 10px; color: #64748b;">Target: ₹${Number(g.target_amount || 0).toLocaleString("en-IN")}</td>
                    <td style="padding: 7px 10px; font-weight: 700; color: #10b981;">₹${Number(g.saved_amount || 0).toLocaleString("en-IN")}</td>
                    <td style="padding: 7px 10px;"><span style="background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">${pct}% Saved</span></td>
                </tr>
            `);
        });

        const recentList = (Array.isArray(expensesData) ? expensesData : expensesData.results || []).slice(0, 6);
        const recentRows = recentList.length > 0
            ? recentList.map(e => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 7px 10px; color: #64748b; font-size: 11.5px;">${e.date}</td>
                    <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">${e.description || e.category_name || 'Expense'}</td>
                    <td style="padding: 7px 10px; color: #64748b; font-size: 11.5px;">${e.category_name || 'Uncategorized'}</td>
                    <td style="padding: 7px 10px; font-weight: 700; color: #ef4444; text-align: right;">-₹${Number(e.amount).toLocaleString("en-IN")}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" style="padding: 10px; text-align: center; color: #94a3b8;">No recent transactions recorded.</td></tr>`;

        // Render printable container
        const printableContainer = document.createElement("div");
        printableContainer.style.width = "780px";
        printableContainer.style.padding = "24px 28px";
        printableContainer.style.background = "#ffffff";
        printableContainer.style.color = "#1e293b";
        printableContainer.style.fontFamily = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        printableContainer.style.fontSize = "12px";
        printableContainer.style.lineHeight = "1.35";

        printableContainer.innerHTML = `
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 24px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px;">
                        Pocket<span style="color: #10b981;">Planner</span>
                    </div>
                    <div style="font-size: 11.5px; color: #64748b; font-weight: 600; margin-top: 2px;">
                        Executive Monthly Financial Health & Cash Flow Statement
                    </div>
                    <div style="font-size: 11.5px; color: #334155; margin-top: 4px;">
                        <strong>Account Holder:</strong> ${username} ${email ? '(' + email + ')' : ''}
                    </div>
                </div>
                <div style="text-align: right; font-size: 11.5px; color: #475569;">
                    <div><strong>Statement Period:</strong> <span style="color: #4f46e5; font-weight: 700;">${monthStr}</span></div>
                    <div><strong>Generated on:</strong> ${dateStr}</div>
                    <div style="margin-top: 3px; font-family: monospace; font-size: 11px; color: #64748b;"><strong>Report ID:</strong> ${reportId}</div>
                </div>
            </div>

            <!-- 4-CARD EXECUTIVE KPI GRID -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 12px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 0.5px;">Available Free Cash</div>
                    <div style="font-size: 18px; font-weight: 800; color: #059669; margin: 3px 0;">₹${availableCash}</div>
                    <div style="font-size: 10px; color: #047857;">100% Free unreserved</div>
                </div>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px;">Current Bank Balance</div>
                    <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin: 3px 0;">₹${currentBalance}</div>
                    <div style="font-size: 10px; color: #1d4ed8;">Opening + Inflow - Outflow</div>
                </div>

                <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 10px 12px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #e11d48; letter-spacing: 0.5px;">Month Expenses</div>
                    <div style="font-size: 18px; font-weight: 800; color: #e11d48; margin: 3px 0;">₹${monthExpenses}</div>
                    <div style="font-size: 10px; color: #be123c;">Total spent this month</div>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #d97706; letter-spacing: 0.5px;">Total Reserved</div>
                    <div style="font-size: 18px; font-weight: 800; color: #d97706; margin: 3px 0;">₹${totalReserved}</div>
                    <div style="font-size: 10px; color: #b45309;">Budgets + Savings Goals</div>
                </div>
            </div>

            <!-- FINANCIAL HEALTH STATUS STRIP -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <span style="font-weight: 700; color: #334155;">Financial Health:</span>
                    <span style="background: #10b981; color: #ffffff; padding: 2px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; margin-left: 4px;">${healthLabel} (${healthScore}/100)</span>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                    Liquidity is well-balanced across planned envelope allocations.
                </div>
            </div>

            <!-- SECTION 1: CATEGORY BREAKDOWN -->
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                    📊 Spending Breakdown by Category
                </div>
                <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 11.5px;">
                    <thead>
                        <tr style="background: #4f46e5; color: #ffffff; font-size: 11px; text-align: left;">
                            <th style="padding: 6px 10px;">Category</th>
                            <th style="padding: 6px 10px;">Amount Spent</th>
                            <th style="padding: 6px 10px;">Share of Outflow</th>
                            <th style="padding: 6px 10px;">Allocation Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${catRows}
                    </tbody>
                </table>
            </div>

            <!-- SECTION 2: ACTIVE BUDGETS & GOALS -->
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                    🎯 Active Budgets & Savings Goals
                </div>
                <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 11.5px;">
                    <thead>
                        <tr style="background: #0f172a; color: #ffffff; font-size: 11px; text-align: left;">
                            <th style="padding: 6px 10px;">Item Name & Type</th>
                            <th style="padding: 6px 10px;">Target Cap / Goal</th>
                            <th style="padding: 6px 10px;">Funded / Saved</th>
                            <th style="padding: 6px 10px;">Progress / Priority</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${planRows.length > 0 ? planRows.join("") : '<tr><td colspan="4" style="padding: 8px; text-align: center; color: #94a3b8;">No active budgets or goals configured.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- SECTION 3: RECENT TRANSACTIONS -->
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                    📜 Recent Transaction Ledger
                </div>
                <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 11.5px;">
                    <thead>
                        <tr style="background: #334155; color: #ffffff; font-size: 11px; text-align: left;">
                            <th style="padding: 6px 10px;">Date</th>
                            <th style="padding: 6px 10px;">Description</th>
                            <th style="padding: 6px 10px;">Category</th>
                            <th style="padding: 6px 10px; text-align: right;">Outflow Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentRows}
                    </tbody>
                </table>
            </div>

            <!-- FOOTER -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #94a3b8;">
                <div>PocketPlanner Personal Finance — Generated Securely & Confidentially</div>
                <div>Official Electronic Cash Flow Statement</div>
            </div>
        `;

        // Append to DOM offscreen so html2canvas can compute dimensions and styles
        printableContainer.style.position = "fixed";
        printableContainer.style.left = "-9999px";
        printableContainer.style.top = "0";
        printableContainer.style.zIndex = "-9999";
        document.body.appendChild(printableContainer);

        // Generate PDF using html2pdf
        const opt = {
            margin: [6, 6, 8, 6],
            filename: `PocketPlanner_Statement_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            if (window.html2pdf) {
                await window.html2pdf().set(opt).from(printableContainer).save();
                showToast("Executive PDF Statement downloaded successfully!", "success");
            } else {
                downloadFile(`/reports/export/monthly/pdf/?_t=${Date.now()}`, "PocketPlanner_Statement.pdf");
            }
        } finally {
            if (printableContainer && printableContainer.parentNode) {
                printableContainer.parentNode.removeChild(printableContainer);
            }
        }

    } catch (err) {
        console.error("PDF generation failed:", err);
        downloadFile(`/reports/export/monthly/pdf/?_t=${Date.now()}`, "PocketPlanner_Statement.pdf");
    }
}

async function initializePage() {
    await loadCategoryChart();
    await loadMonthlyChart();
    await loadSavingsTotal();
    await loadBudgetReport();
}

initializePage();
