let timerInterval;
let startTimeMs = 0;
let isRunning = false;
let isPaused = false;
let elapsedBeforePauseMs = 0;
let sessions = [];
let timelineChart;
let weeklyChart;

const STORAGE_KEY = "productivity-sessions";

const timeDisplay = document.getElementById("time-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const clearSessionsBtn = document.getElementById("clear-sessions-btn");
const sessionList = document.getElementById("session-list");
const totalToday = document.getElementById("total-today");
const sessionCountToday = document.getElementById("session-count-today");
const averageSessionToday = document.getElementById("average-session-today");
const streakDays = document.getElementById("streak-days");
const timelineCanvas = document.getElementById("timeline-chart");
const weeklyCanvas = document.getElementById("weekly-chart");
const weeklyRange = document.getElementById("weekly-range");
const timerCard = document.getElementById("timer-card");
const liveStatus = document.getElementById("live-status");

Chart.defaults.color = "#9aa9d6";
Chart.defaults.borderColor = "rgba(154, 169, 214, 0.15)";
Chart.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif";

function loadSessions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            sessions = parsed
                .filter((entry) => entry && entry.timestamp)
                .map((entry) => ({
                    timestamp: entry.timestamp,
                    durationMs: entry.durationMs ?? Math.max(0, (entry.duration || 0) * 1000)
                }));
        } catch (error) {
            sessions = [];
        }
    }

    sessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    saveSessions();
    renderAll();
}

function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function formatDuration(milliseconds, withMs = false) {
    const totalMs = Math.max(0, Math.floor(milliseconds));
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const base = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

    if (!withMs) {
        return base;
    }

    const ms = (totalMs % 1000).toString().padStart(3, "0");
    return `${base}.${ms}`;
}

function formatHoursMinutes(milliseconds) {
    const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startTimer() {
    if (isRunning || isPaused) {
        return;
    }

    startTimeMs = Date.now();
    elapsedBeforePauseMs = 0;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause";
    stopBtn.disabled = false;
    timerCard.classList.add("running");
    liveStatus.textContent = "Fokus läuft";
    liveStatus.classList.add("active");
    timerInterval = setInterval(updateDisplay, 33);
}

function stopTimer() {
    if (!isRunning && !isPaused) {
        return;
    }

    const now = Date.now();
    const durationMs = isRunning ? elapsedBeforePauseMs + (now - startTimeMs) : elapsedBeforePauseMs;

    sessions.push({
        durationMs,
        timestamp: new Date(now).toISOString()
    });

    saveSessions();
    isRunning = false;
    isPaused = false;
    elapsedBeforePauseMs = 0;
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    stopBtn.disabled = true;
    timerCard.classList.remove("running");
    liveStatus.textContent = "Bereit";
    liveStatus.classList.remove("active");
    timeDisplay.textContent = "00:00:00.000";
    renderAll();
}

function updateDisplay() {
    if (!isRunning) {
        return;
    }

    const elapsedMs = elapsedBeforePauseMs + (Date.now() - startTimeMs);
    timeDisplay.textContent = formatDuration(elapsedMs, true);
}

function togglePause() {
    if (!isRunning && !isPaused) {
        return;
    }

    if (isRunning) {
        elapsedBeforePauseMs += Date.now() - startTimeMs;
        isRunning = false;
        isPaused = true;
        clearInterval(timerInterval);
        pauseBtn.textContent = "Fortsetzen";
        timerCard.classList.remove("running");
        liveStatus.textContent = "Pausiert";
        liveStatus.classList.remove("active");
        return;
    }

    startTimeMs = Date.now();
    isRunning = true;
    isPaused = false;
    pauseBtn.textContent = "Pause";
    timerCard.classList.add("running");
    liveStatus.textContent = "Fokus läuft";
    liveStatus.classList.add("active");
    timerInterval = setInterval(updateDisplay, 33);
}

function getTodaySessions() {
    const now = new Date();
    return sessions.filter((session) => sameDate(new Date(session.timestamp), now));
}

function updateStats() {
    const todaySessions = getTodaySessions();
    const totalMsToday = todaySessions.reduce((sum, session) => sum + session.durationMs, 0);
    const avgMs = todaySessions.length ? totalMsToday / todaySessions.length : 0;

    totalToday.textContent = formatDuration(totalMsToday);
    sessionCountToday.textContent = `${todaySessions.length}`;
    averageSessionToday.textContent = formatDuration(avgMs);
    streakDays.textContent = `${calculateStreakDays()}`;
}

function calculateStreakDays() {
    if (!sessions.length) {
        return 0;
    }

    const uniqueDays = new Set(
        sessions.map((session) => {
            const date = new Date(session.timestamp);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        })
    );

    let streak = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    while (uniqueDays.has(current.getTime())) {
        streak += 1;
        current.setDate(current.getDate() - 1);
    }

    return streak;
}

function displaySessions() {
    const ordered = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
    sessionList.innerHTML = "";

    if (!ordered.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Noch keine Sessions gespeichert. Starte deine erste Fokus-Session.";
        sessionList.appendChild(empty);
        return;
    }

    ordered.forEach((session, index) => {
        const li = document.createElement("li");
        li.className = "session-item";

        const number = document.createElement("span");
        number.className = "session-index";
        number.textContent = `#${index + 1}`;

        const duration = document.createElement("span");
        duration.className = "session-duration";
        duration.textContent = formatDuration(session.durationMs, true);

        const time = document.createElement("span");
        time.className = "session-time";
        time.textContent = new Date(session.timestamp).toLocaleString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "session-delete";
        deleteBtn.textContent = "Löschen";
        deleteBtn.type = "button";
        deleteBtn.addEventListener("click", () => {
            const removeIndex = sessions.findIndex(
                (entry) => entry.timestamp === session.timestamp && entry.durationMs === session.durationMs
            );
            if (removeIndex !== -1) {
                sessions.splice(removeIndex, 1);
                saveSessions();
                renderAll();
            }
        });

        li.append(number, duration, time, deleteBtn);
        sessionList.appendChild(li);
    });
}

function buildTimelineChart() {
    if (timelineChart) {
        timelineChart.destroy();
    }

    const todaySessions = getTodaySessions();
    const sessionPoints = todaySessions
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map((session) => {
            const end = new Date(session.timestamp);
            const start = new Date(end.getTime() - session.durationMs);
            return {
                x: end,
                y: session.durationMs,
                start
            };
        });

    let minTime;
    let maxTime;

    if (sessionPoints.length) {
        const earliest = Math.min(...sessionPoints.map((point) => point.start.getTime()));
        const latest = Math.max(...sessionPoints.map((point) => point.x.getTime()));
        const roundedEarliest = new Date(Math.floor(earliest / 3600000) * 3600000);
        const roundedLatest = new Date(Math.ceil(latest / 3600000) * 3600000);
        minTime = roundedEarliest;
        maxTime = roundedLatest;
    }

    const dataset = sessionPoints.length
        ? [
            { x: minTime, y: 0, isAnchor: true },
            ...sessionPoints,
            { x: maxTime, y: 0, isAnchor: true }
        ]
        : [];

    timelineChart = new Chart(timelineCanvas.getContext("2d"), {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Sessiondauer in Minuten",
                    data: dataset,
                    pointRadius(context) {
                        return context.raw?.isAnchor ? 0 : 4;
                    },
                    pointHoverRadius(context) {
                        return context.raw?.isAnchor ? 0 : 6;
                    },
                    borderWidth: 2,
                    borderColor: "#67a2ff",
                    backgroundColor: "rgba(103, 162, 255, 0.26)",
                    fill: true,
                    tension: 0.38
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title(context) {
                            return new Date(context[0].raw.x).toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit"
                            });
                        },
                        label(context) {
                            if (context.raw.isAnchor) {
                                return "Zeitfenster";
                            }
                            return `Dauer: ${formatDuration(context.raw.y, true)}`;
                        },
                        afterLabel(context) {
                            if (context.raw.isAnchor) {
                                return "";
                            }
                            return `Start: ${new Date(context.raw.start).toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit"
                            })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "time",
                    min: minTime,
                    max: maxTime,
                    time: { unit: "hour", displayFormats: { hour: "HH:mm" } },
                    title: { display: true, text: "Tageszeit" },
                    ticks: {
                        maxTicksLimit: 10,
                        callback(value) {
                            return new Date(value).toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit"
                            });
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Dauer (hh:mm)" },
                    ticks: {
                        callback(value) {
                            return formatHoursMinutes(value);
                        }
                    }
                }
            }
        }
    });
}

function buildWeeklyChart() {
    if (weeklyChart) {
        weeklyChart.destroy();
    }

    const rangeDays = Number(weeklyRange?.value || 7);
    const dayBuckets = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = rangeDays - 1; i >= 0; i -= 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        dayBuckets.push({
            key: day.toDateString(),
            label: day.toLocaleDateString("de-DE", { weekday: "short" }),
            totalMs: 0
        });
    }

    const bucketMap = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));
    sessions.forEach((session) => {
        const key = new Date(session.timestamp).toDateString();
        if (bucketMap.has(key)) {
            bucketMap.get(key).totalMs += session.durationMs;
        }
    });

    const labels = dayBuckets.map((bucket) => bucket.label);
    const totalsMs = dayBuckets.map((bucket) => bucket.totalMs);

    weeklyChart = new Chart(weeklyCanvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Fokuszeit",
                    data: totalsMs,
                    borderRadius: 8,
                    backgroundColor: "rgba(47, 230, 167, 0.65)",
                    borderColor: "rgba(47, 230, 167, 0.95)",
                    borderWidth: 1.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = context.raw || 0;
                            return `Fokuszeit: ${formatDuration(value, true)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Dauer (hh:mm)" },
                    ticks: {
                        callback(value) {
                            return formatHoursMinutes(value);
                        }
                    }
                }
            }
        }
    });
}

function renderAll() {
    displaySessions();
    updateStats();
    buildTimelineChart();
    buildWeeklyChart();
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", togglePause);
stopBtn.addEventListener("click", stopTimer);
weeklyRange.addEventListener("change", buildWeeklyChart);
clearSessionsBtn.addEventListener("click", () => {
    if (!sessions.length) {
        return;
    }
    const confirmed = window.confirm("Alle gespeicherten Sessions wirklich löschen?");
    if (!confirmed) {
        return;
    }
    sessions = [];
    saveSessions();
    renderAll();
});

document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
        event.preventDefault();
        if (!isRunning && !isPaused) {
            startTimer();
            return;
        }
        togglePause();
        return;
    }

    if (event.key.toLowerCase() === "s") {
        if (isRunning || isPaused) {
            stopTimer();
        }
    }
});

loadSessions();