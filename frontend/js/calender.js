// ===============================
// EXPENSE CALENDAR LOGIC
// ===============================
const token = localStorage.getItem("access_token");
if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    renderCalendar();
});

async function renderCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    let expenses = [];
    try {
        const res = await apiRequest("/expenses/");
        expenses = Array.isArray(res) ? res : res.results || [];
    } catch (err) {
        console.error("Failed to load expenses for calendar", err);
        showToast("Could not load calendar data.", "error");
        return;
    }

    const events = buildDailyEvents(expenses);

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        height: "auto",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: ""
        },
        events: events,
        dateClick: function (info) {
            showDayExpenses(info.dateStr, expenses);
        },
        eventClick: function (info) {
            const dateStr = info.event.startStr;
            showDayExpenses(dateStr, expenses);
        },
    });

    calendar.render();
}

function buildDailyEvents(expenses) {
    const totals = {};

    expenses.forEach((exp) => {
        const date = exp.date;
        totals[date] = (totals[date] || 0) + parseFloat(exp.amount);
    });

    return Object.keys(totals).map((date) => {
        const isHigh = totals[date] > 2000;
        return {
            title: `₹${Number(totals[date]).toLocaleString("en-IN")}`,
            start: date,
            allDay: true,
            backgroundColor: isHigh ? "#ef4444" : "#10b981",
            borderColor: isHigh ? "#dc2626" : "#059669",
            textColor: "#ffffff"
        };
    });
}

function showDayExpenses(dateStr, expenses) {
    const dayExpenses = expenses.filter((e) => e.date === dateStr);
    const container = document.getElementById("dayExpenseList");
    if (!container) return;

    if (dayExpenses.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted p-4" style="font-size: 13px;">
                No expenses logged on <strong>${dateStr}</strong>.
            </div>
        `;
        return;
    }

    const totalDay = dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <span class="fw-bold" style="font-size: 14px;">${dateStr}</span>
            <span class="fw-bold" style="color: var(--danger); font-size: 14px;">Total: ₹${Number(totalDay).toLocaleString("en-IN")}</span>
        </div>
        <div class="d-flex flex-column gap-2" style="max-height: 300px; overflow-y: auto;">
            ${dayExpenses.map((e) => `
                <div class="p-2 d-flex justify-content-between align-items-center" style="background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border);">
                    <div>
                        <div class="fw-bold" style="font-size: 13px; color: var(--text-main);">${e.description || "Expense"}</div>
                        <span class="pill-badge badge-indigo" style="font-size: 10px; padding: 1px 6px;">${e.category_name || "Uncategorized"}</span>
                    </div>
                    <span class="fw-bold" style="color: var(--danger); font-size: 13.5px;">-₹${Number(e.amount).toLocaleString("en-IN")}</span>
                </div>
            `).join("")}
        </div>
    `;
}
