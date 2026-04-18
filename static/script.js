let timerInterval;
let startTimeMs = 0;
let isRunning = false;
let isPaused = false;
let elapsedBeforePauseMs = 0;
let sessions = [];
let subjects = [];
let subjectShareChart;
let weeklyChart;
let subjectShareChartInitialized = false;
let weeklyChartInitialized = false;

const STORAGE_KEY = "productivity-sessions";
const SUBJECTS_STORAGE_KEY = "productivity-subjects";
const DEFAULT_SUBJECT_COLOR = "#67a2ff";
const PRESET_COLORS = [
    "#67a2ff",
    "#387dff",
    "#2fe6a7",
    "#ffbe4d",
    "#ff647f",
    "#8b5cf6",
    "#14b8a6",
    "#ef4444",
    "#f59e0b",
    "#ffffff",
    "#9ca3af",
    "#000000"
];

const timeDisplay = document.getElementById("time-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const clearSessionsBtn = document.getElementById("clear-sessions-btn");
const toggleSessionEditorBtn = document.getElementById("toggle-session-editor-btn");
const sessionList = document.getElementById("session-list");
const sessionEditor = document.getElementById("session-editor");
const sessionEditorForm = document.getElementById("session-editor-form");
const sessionEditorDate = document.getElementById("session-editor-date");
const sessionEditorTime = document.getElementById("session-editor-time");
const sessionEditorDuration = document.getElementById("session-editor-duration");
const sessionEditorSubject = document.getElementById("session-editor-subject");
const sessionEditorList = document.getElementById("session-editor-list");
const totalToday = document.getElementById("total-today");
const sessionCountToday = document.getElementById("session-count-today");
const averageSessionToday = document.getElementById("average-session-today");
const streakDays = document.getElementById("streak-days");
const subjectShareCanvas = document.getElementById("subject-share-chart");
const overallFocusTotal = document.getElementById("overall-focus-total");
const weeklyCanvas = document.getElementById("weekly-chart");
const weeklyRange = document.getElementById("weekly-range");
const subjectShareRange = document.getElementById("subject-share-range");
const timerCard = document.getElementById("timer-card");
const liveStatus = document.getElementById("live-status");
const activeSubjectSelect = document.getElementById("active-subject-select");
const subjectForm = document.getElementById("subject-form");
const subjectNameInput = document.getElementById("subject-name-input");
const colorPresetContainer = document.getElementById("color-presets");
const customColorBtn = document.getElementById("custom-color-btn");
const subjectColorInput = document.getElementById("subject-color-input");
const subjectList = document.getElementById("subject-list");
let selectedSubjectColor = DEFAULT_SUBJECT_COLOR;

Chart.defaults.color = "#9aa9d6";
Chart.defaults.borderColor = "rgba(154, 169, 214, 0.15)";
Chart.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif";

function createDefaultSubject() {
    return {
        id: `subject-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "Allgemein",
        color: DEFAULT_SUBJECT_COLOR
    };
}

function getSubjectById(subjectId) {
    return subjects.find((subject) => subject.id === subjectId);
}

function loadSubjects() {
    const fallback = [createDefaultSubject()];
    const stored = localStorage.getItem(SUBJECTS_STORAGE_KEY);
    if (!stored) {
        subjects = fallback;
        saveSubjects();
        return;
    }

    try {
        const parsed = JSON.parse(stored);
        const sanitized = (Array.isArray(parsed) ? parsed : [])
            .filter((subject) => subject && subject.id && subject.name)
            .map((subject) => ({
                id: String(subject.id),
                name: String(subject.name).trim() || "Unbenannt",
                color: /^#[0-9a-fA-F]{6}$/.test(subject.color) ? subject.color : DEFAULT_SUBJECT_COLOR
            }));
        subjects = sanitized.length ? sanitized : fallback;
    } catch (error) {
        subjects = fallback;
    }

    if (!subjects.length) {
        subjects = [createDefaultSubject()];
    }
    saveSubjects();
}

function getFallbackSubjectId() {
    return subjects[0]?.id ?? "";
}

function normalizeSessionSubject(sessionSubjectId) {
    return getSubjectById(sessionSubjectId) ? sessionSubjectId : getFallbackSubjectId();
}

function loadSessions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            sessions = parsed
                .filter((entry) => entry && entry.timestamp)
                .map((entry) => ({
                    timestamp: entry.timestamp,
                    durationMs: entry.durationMs ?? Math.max(0, (entry.duration || 0) * 1000),
                    subjectId: normalizeSessionSubject(entry.subjectId)
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

function saveSubjects() {
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
}

function selectSubjectColor(color) {
    selectedSubjectColor = color;
    subjectColorInput.value = color;

    const swatches = colorPresetContainer.querySelectorAll(".color-swatch");
    swatches.forEach((swatch) => {
        swatch.classList.toggle("active", swatch.dataset.color === color);
    });
    customColorBtn.classList.toggle("active", !PRESET_COLORS.includes(color.toLowerCase()));
}

function buildColorPresets() {
    colorPresetContainer.innerHTML = "";
    PRESET_COLORS.forEach((color) => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "color-swatch";
        swatch.dataset.color = color.toLowerCase();
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.setAttribute("aria-label", `Farbe ${color}`);
        swatch.addEventListener("click", () => {
            selectSubjectColor(color.toLowerCase());
        });
        colorPresetContainer.appendChild(swatch);
    });
    selectSubjectColor(DEFAULT_SUBJECT_COLOR);
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
        timestamp: new Date(now).toISOString(),
        subjectId: activeSubjectSelect.value || getFallbackSubjectId()
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

function buildSubjectSelect() {
    const previousValue = activeSubjectSelect.value;
    activeSubjectSelect.innerHTML = "";
    subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;
        activeSubjectSelect.appendChild(option);
    });
    const hasPrevious = subjects.some((subject) => subject.id === previousValue);
    activeSubjectSelect.value = hasPrevious ? previousValue : getFallbackSubjectId();
    buildSessionEditorSubjectSelect();
}

function buildSessionEditorSubjectSelect() {
    if (!sessionEditorSubject) {
        return;
    }
    const previousValue = sessionEditorSubject.value;
    sessionEditorSubject.innerHTML = "";
    subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;
        sessionEditorSubject.appendChild(option);
    });
    const hasPrevious = subjects.some((subject) => subject.id === previousValue);
    sessionEditorSubject.value = hasPrevious ? previousValue : getFallbackSubjectId();
}

function displaySubjects() {
    subjectList.innerHTML = "";
    subjects.forEach((subject) => {
        const li = document.createElement("li");
        li.className = "subject-item";

        const swatch = document.createElement("span");
        swatch.className = "subject-color";
        swatch.style.backgroundColor = subject.color;

        const name = document.createElement("span");
        name.className = "subject-name";
        name.textContent = subject.name;

        const removeBtn = document.createElement("button");
        removeBtn.className = "session-delete";
        removeBtn.textContent = "Löschen";
        removeBtn.type = "button";
        removeBtn.addEventListener("click", () => {
            const usedBySessions = sessions.some((session) => session.subjectId === subject.id);
            if (usedBySessions) {
                const confirmed = window.confirm(
                    "Diese Kategorie wird in Sessions genutzt. Beim Löschen werden diese Sessions auf eine andere Kategorie umgestellt. Fortfahren?"
                );
                if (!confirmed) {
                    return;
                }
            }

            subjects = subjects.filter((entry) => entry.id !== subject.id);
            if (!subjects.length) {
                subjects = [createDefaultSubject()];
            }

            const replacementSubjectId = getFallbackSubjectId();
            sessions = sessions.map((session) => ({
                ...session,
                subjectId: session.subjectId === subject.id ? replacementSubjectId : normalizeSessionSubject(session.subjectId)
            }));

            saveSessions();
            saveSubjects();
            buildSubjectSelect();
            renderAll();
        });

        li.append(swatch, name, removeBtn);

        subjectList.appendChild(li);
    });
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

function getSessionsByRange(rangeValue) {
    if (rangeValue === "all") {
        return sessions;
    }

    const now = new Date();
    if (rangeValue === "today") {
        return sessions.filter((session) => sameDate(new Date(session.timestamp), now));
    }

    const days = Number(rangeValue);
    if (!Number.isFinite(days) || days <= 0) {
        return sessions;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return sessions.filter((session) => new Date(session.timestamp) >= start);
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
        const subject = getSubjectById(session.subjectId) || { name: "Ohne Kategorie", color: "#9ca3af" };
        time.textContent = `${subject.name} · ${new Date(session.timestamp).toLocaleString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        })}`;
        time.style.color = subject.color;

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

function parseDurationTimeToMs(durationValue) {
    const [hours, minutes, seconds] = (durationValue || "00:00:00").split(":").map((part) => Number(part));
    if ([hours, minutes, seconds].some((value) => !Number.isFinite(value) || value < 0)) {
        return 0;
    }
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function displayAllSessionsEditor() {
    if (!sessionEditorList) {
        return;
    }
    const ordered = [...sessions]
        .map((session, originalIndex) => ({ ...session, originalIndex }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sessionEditorList.innerHTML = "";
    if (!ordered.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Keine Sessions vorhanden.";
        sessionEditorList.appendChild(empty);
        return;
    }

    ordered.forEach((session) => {
        const li = document.createElement("li");
        li.className = "session-item";

        const duration = document.createElement("span");
        duration.className = "session-duration";
        duration.textContent = formatDuration(session.durationMs, true);

        const subject = getSubjectById(session.subjectId) || { name: "Ohne Kategorie", color: "#9ca3af" };
        const meta = document.createElement("span");
        meta.className = "session-time";
        meta.style.color = subject.color;
        meta.textContent = `${subject.name} · ${new Date(session.timestamp).toLocaleString("de-DE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        })}`;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "session-delete";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Löschen";
        deleteBtn.addEventListener("click", () => {
            sessions.splice(session.originalIndex, 1);
            saveSessions();
            renderAll();
        });

        li.append(duration, meta, deleteBtn);
        sessionEditorList.appendChild(li);
    });
}

function buildSubjectShareChart() {
    if (subjectShareChart) {
        subjectShareChart.destroy();
    }

    const totalsBySubject = new Map(subjects.map((subject) => [subject.id, 0]));
    const filteredSessions = getSessionsByRange(subjectShareRange?.value || "all");
    filteredSessions.forEach((session) => {
        const subjectId = normalizeSessionSubject(session.subjectId);
        totalsBySubject.set(subjectId, (totalsBySubject.get(subjectId) || 0) + session.durationMs);
    });

    const subjectData = subjects
        .map((subject) => ({
            label: subject.name,
            color: subject.color,
            value: totalsBySubject.get(subject.id) || 0
        }))
        .filter((entry) => entry.value > 0);

    const totalFocusMs = filteredSessions.reduce((sum, session) => sum + session.durationMs, 0);
    overallFocusTotal.textContent = formatDuration(totalFocusMs);

    const labels = subjectData.length ? subjectData.map((entry) => entry.label) : ["Noch keine Daten"];
    const data = subjectData.length ? subjectData.map((entry) => entry.value) : [1];
    const colors = subjectData.length ? subjectData.map((entry) => entry.color) : ["#4b5563"];

    subjectShareChart = new Chart(subjectShareCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: colors,
                    borderColor: "rgba(7, 11, 22, 0.7)",
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            if (!subjectData.length) {
                                return "Noch keine Fokuszeit erfasst";
                            }
                            const value = context.raw || 0;
                            const percent = totalFocusMs ? ((value / totalFocusMs) * 100).toFixed(1) : "0.0";
                            return `${context.label}: ${formatDuration(value)} (${percent}%)`;
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
            totalsBySubject: {}
        });
    }

    const bucketMap = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));
    sessions.forEach((session) => {
        const key = new Date(session.timestamp).toDateString();
        if (bucketMap.has(key)) {
            const bucket = bucketMap.get(key);
            const subjectId = normalizeSessionSubject(session.subjectId);
            bucket.totalsBySubject[subjectId] = (bucket.totalsBySubject[subjectId] || 0) + session.durationMs;
        }
    });

    const labels = dayBuckets.map((bucket) => bucket.label);
    const datasets = subjects.map((subject) => ({
        label: subject.name,
        data: dayBuckets.map((bucket) => bucket.totalsBySubject[subject.id] || 0),
        stack: "focus",
        borderRadius: 6,
        backgroundColor: `${subject.color}aa`,
        borderColor: subject.color,
        borderWidth: 1
    }));

    weeklyChart = new Chart(weeklyCanvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = context.raw || 0;
                            return `${context.dataset.label}: ${formatDuration(value, true)}`;
                        },
                        footer(contextItems) {
                            const total = contextItems.reduce((sum, item) => sum + (item.raw || 0), 0);
                            return `Gesamt: ${formatDuration(total, true)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    beginAtZero: true,
                    stacked: true,
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
    displaySubjects();
    displaySessions();
    displayAllSessionsEditor();
    updateStats();
    if (subjectShareChartInitialized) {
        buildSubjectShareChart();
    }
    if (weeklyChartInitialized) {
        buildWeeklyChart();
    }
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", togglePause);
stopBtn.addEventListener("click", stopTimer);
weeklyRange.addEventListener("change", () => {
    if (weeklyChartInitialized) {
        buildWeeklyChart();
    }
});
subjectShareRange.addEventListener("change", () => {
    if (subjectShareChartInitialized) {
        buildSubjectShareChart();
    }
});
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

toggleSessionEditorBtn.addEventListener("click", () => {
    sessionEditor.classList.toggle("hidden");
    const isOpen = !sessionEditor.classList.contains("hidden");
    toggleSessionEditorBtn.textContent = isOpen ? "Editor schließen" : "Sessions bearbeiten";
});

sessionEditorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const dateValue = sessionEditorDate.value;
    const timeValue = sessionEditorTime.value;
    const durationMs = parseDurationTimeToMs(sessionEditorDuration.value);
    const subjectId = sessionEditorSubject.value || getFallbackSubjectId();

    if (!dateValue || !timeValue || durationMs <= 0) {
        window.alert("Bitte gib gültige Werte für Datum, Uhrzeit und Dauer an.");
        return;
    }

    const timestamp = new Date(`${dateValue}T${timeValue}`).toISOString();
    sessions.push({
        timestamp,
        durationMs,
        subjectId: normalizeSessionSubject(subjectId)
    });
    sessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    saveSessions();
    renderAll();
});

const scrollVisibilityObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            const panel = entry.target;
            panel.classList.toggle("visible", entry.isIntersecting);
            if (!entry.isIntersecting) {
                return;
            }

            if (panel.classList.contains("share-panel") && !subjectShareChartInitialized) {
                subjectShareChartInitialized = true;
                buildSubjectShareChart();
            }
            if (panel.classList.contains("weekly-panel") && !weeklyChartInitialized) {
                weeklyChartInitialized = true;
                buildWeeklyChart();
            }
        });
    },
    {
        root: null,
        threshold: 0.35
    }
);

function observeScrollPanels() {
    const selectors = [".timer-card", ".stats-grid", ".panel"];
    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            scrollVisibilityObserver.observe(element);
        });
    });
}

subjectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = subjectNameInput.value.trim();
    if (!name) {
        return;
    }
    const duplicate = subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        window.alert("Diese Kategorie existiert bereits.");
        return;
    }

    subjects.push({
        id: `subject-${Date.now()}`,
        name,
        color: selectedSubjectColor
    });
    saveSubjects();
    buildSubjectSelect();
    subjectNameInput.value = "";
    selectSubjectColor(DEFAULT_SUBJECT_COLOR);
    renderAll();
});

customColorBtn.addEventListener("click", () => {
    customColorBtn.classList.add("active");
    subjectColorInput.click();
});

subjectColorInput.addEventListener("input", (event) => {
    selectSubjectColor(event.target.value.toLowerCase());
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

loadSubjects();
buildColorPresets();
buildSubjectSelect();
sessionEditorDate.value = new Date().toISOString().slice(0, 10);
sessionEditorTime.value = new Date().toTimeString().slice(0, 5);
loadSessions();
observeScrollPanels();