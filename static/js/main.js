// ── Main Application Logic ──

const TASK_COLORS = [
    '#f87171', '#60a5fa', '#a78bfa', '#34d399',
    '#fbbf24', '#f472b6', '#22d3ee', '#fb923c'
];

let tasks = [
    { id: 'P1', name: 'P1', arrival_time: 0, execution_time: 3, deadline: 7, period: 10 },
    { id: 'P2', name: 'P2', arrival_time: 1, execution_time: 2, deadline: 5, period: 8 },
    { id: 'P3', name: 'P3', arrival_time: 2, execution_time: 1, deadline: 4, period: 6 },
    { id: 'P4', name: 'P4', arrival_time: 3, execution_time: 2, deadline: 9, period: 12 }
];
let selectedRows = new Set();
let nextAutoId = 5;
let simulationData = null;
let stepIndex = 0;
let isPaused = false;

// ── Render task table ──
function renderTaskTable() {
    const tbody = document.getElementById('task-tbody');
    const emptyMsg = document.getElementById('task-empty');
    tbody.innerHTML = '';

    if (tasks.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    tasks.forEach((task, idx) => {
        const color = TASK_COLORS[idx % TASK_COLORS.length];
        const tr = document.createElement('tr');
        tr.dataset.id = task.id;
        if (selectedRows.has(task.id)) tr.classList.add('selected');

        tr.innerHTML = `
            <td><input type="checkbox" class="row-check" data-id="${task.id}" ${selectedRows.has(task.id) ? 'checked' : ''}></td>
            <td style="color:${color}; font-weight:600;">${task.id}</td>
            <td>${task.arrival_time}</td>
            <td>${task.execution_time}</td>
            <td>${task.deadline}</td>
            <td>${task.period}</td>
        `;

        tr.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            if (selectedRows.has(task.id)) {
                selectedRows.delete(task.id);
            } else {
                selectedRows.add(task.id);
            }
            renderTaskTable();
        });

        tbody.appendChild(tr);
    });

    // Checkbox sync
    tbody.querySelectorAll('.row-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) selectedRows.add(id);
            else selectedRows.delete(id);
            renderTaskTable();
        });
    });
}

// ── Render results table ──
function renderResults(completedJobs) {
    const tbody = document.getElementById('result-tbody');
    const emptyMsg = document.getElementById('result-empty');
    tbody.innerHTML = '';

    if (!completedJobs || completedJobs.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    completedJobs.forEach(job => {
        const tr = document.createElement('tr');
        const statusClass = job.missed ? 'badge--missed' : 'badge--met';
        const statusText = job.missed ? 'MISSED' : 'MET';
        tr.innerHTML = `
            <td style="font-weight:600;">${job.task_id}</td>
            <td>${job.completion_time}</td>
            <td>${job.turnaround_time}</td>
            <td>${job.waiting_time}</td>
            <td>${job.response_time}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Add Task ──
document.getElementById('btn-add').addEventListener('click', () => {
    let id = document.getElementById('inp-id').value.trim();
    if (!id) {
        id = 'P' + nextAutoId;
    }
    // Check duplicate
    if (tasks.find(t => t.id === id)) {
        alert('Task ID "' + id + '" already exists.');
        return;
    }

    const arrival = parseInt(document.getElementById('inp-arrival').value) || 0;
    const burst = parseInt(document.getElementById('inp-burst').value) || 1;
    const deadline = parseInt(document.getElementById('inp-deadline').value) || 10;
    const period = parseInt(document.getElementById('inp-period').value) || 10;

    tasks.push({
        id: id,
        name: id,
        arrival_time: arrival,
        execution_time: burst,
        deadline: deadline,
        period: period
    });
    nextAutoId++;

    // Clear ID field
    document.getElementById('inp-id').value = '';
    renderTaskTable();
});

// ── Delete Selected ──
document.getElementById('btn-delete').addEventListener('click', () => {
    if (selectedRows.size === 0) {
        alert('Select tasks to delete first.');
        return;
    }
    tasks = tasks.filter(t => !selectedRows.has(t.id));
    selectedRows.clear();
    renderTaskTable();
});

// ── Load Sample ──
document.getElementById('btn-sample').addEventListener('click', () => {
    tasks = [
        { id: 'P1', name: 'P1', arrival_time: 0, execution_time: 3, deadline: 7, period: 4 },
        { id: 'P2', name: 'P2', arrival_time: 1, execution_time: 2, deadline: 5, period: 5 },
        { id: 'P3', name: 'P3', arrival_time: 2, execution_time: 1, deadline: 4, period: 6 },
        { id: 'P4', name: 'P4', arrival_time: 3, execution_time: 2, deadline: 9, period: 8 }
    ];
    nextAutoId = 5;
    selectedRows.clear();
    renderTaskTable();
});

// ── Reset All ──
document.getElementById('btn-reset').addEventListener('click', () => {
    tasks = [];
    selectedRows.clear();
    nextAutoId = 1;
    simulationData = null;
    renderTaskTable();
    document.getElementById('result-tbody').innerHTML = '';
    document.getElementById('result-empty').style.display = 'block';
    document.getElementById('stat-cpu').textContent = '—';
    document.getElementById('stat-missed').textContent = '—';
    document.getElementById('stat-met').textContent = '—';
    document.getElementById('stat-turn').textContent = '—';
    document.getElementById('stat-wait').textContent = '—';
    document.getElementById('gantt-empty').classList.remove('hidden');
    document.getElementById('legend').innerHTML = '';

    // Clear canvas
    const canvas = document.getElementById('gantt-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ── Run Simulation ──
document.getElementById('btn-simulate').addEventListener('click', runSimulation);

async function runSimulation() {
    if (tasks.length === 0) {
        alert('Please add tasks first. Use "Load Sample" for quick start.');
        return;
    }

    const algorithm = document.getElementById('algo-select').value;
    const totalTime = Math.max(30, Math.max(...tasks.map(t => t.period * 3 || 50)));
    const spinner = document.getElementById('run-spinner');
    spinner.classList.add('active');

    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithm, total_time: totalTime, tasks })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Simulation failed');
        }

        const data = await response.json();
        simulationData = data;

        // Update stats
        const stats = data.stats;
        document.getElementById('stat-cpu').textContent = stats.cpu_utilization + '%';
        document.getElementById('stat-missed').textContent = stats.total_missed;
        document.getElementById('stat-met').textContent = stats.total_completed;
        document.getElementById('stat-turn').textContent = stats.avg_turnaround;
        document.getElementById('stat-wait').textContent = stats.avg_waiting;

        // Render results table
        renderResults(data.completed_jobs);

        // Draw Gantt chart
        document.getElementById('gantt-empty').classList.add('hidden');
        window.GanttVisualizer.draw(data, totalTime, tasks);

        // Populate Analytics
        populateAnalytics(data);

    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    } finally {
        spinner.classList.remove('active');
    }
}

// ── Show Gantt (scroll to chart) ──
document.getElementById('btn-gantt').addEventListener('click', () => {
    document.getElementById('gantt-section').scrollIntoView({ behavior: 'smooth' });
});

// ── Step Mode ──
document.getElementById('btn-step').addEventListener('click', () => {
    if (!simulationData) {
        alert('Run a simulation first.');
        return;
    }
    if (stepIndex < simulationData.execution_log.length) {
        const partialData = {
            ...simulationData,
            execution_log: simulationData.execution_log.slice(0, stepIndex + 1)
        };
        const totalTime = Math.max(30, Math.max(...tasks.map(t => t.period * 3 || 50)));
        document.getElementById('gantt-empty').classList.add('hidden');
        window.GanttVisualizer.draw(partialData, totalTime, tasks);
        stepIndex++;
    } else {
        alert('Simulation complete. All steps shown.');
        stepIndex = 0;
    }
});

// ── Pause/Resume ──
document.getElementById('btn-pause').addEventListener('click', () => {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = isPaused ? '▶ Resume' : '⏸ Pause/Resume';
    stepIndex = 0;
});

// ══════════════════════════════════════════
// ── ANALYTICS SECTION ──
// ══════════════════════════════════════════

function populateAnalytics(data) {
    const tbody = document.getElementById('analytics-tbody');
    const emptyMsg = document.getElementById('analytics-empty');
    tbody.innerHTML = '';

    const taskIds = [...new Set(tasks.map(t => t.id))];
    const perTask = {};

    taskIds.forEach(id => {
        perTask[id] = { released: 0, completed: 0, missed: 0, turnarounds: [], waits: [], responses: [] };
    });

    // Count releases from timeline events
    if (data.timeline_events) {
        data.timeline_events.forEach(ev => {
            if (ev.event === 'release' && perTask[ev.task_id]) {
                perTask[ev.task_id].released++;
            }
        });
    }

    // Count completed jobs and gather metrics
    if (data.completed_jobs) {
        data.completed_jobs.forEach(job => {
            if (perTask[job.task_id]) {
                perTask[job.task_id].completed++;
                if (job.turnaround_time != null) perTask[job.task_id].turnarounds.push(job.turnaround_time);
                if (job.waiting_time != null) perTask[job.task_id].waits.push(job.waiting_time);
                if (job.response_time != null) perTask[job.task_id].responses.push(job.response_time);
            }
        });
    }

    // Count missed
    if (data.missed_deadlines) {
        data.missed_deadlines.forEach(m => {
            if (perTask[m.task_id]) perTask[m.task_id].missed++;
        });
    }

    if (taskIds.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '—';

    taskIds.forEach((id, idx) => {
        const p = perTask[id];
        const total = p.completed + p.missed;
        const missRate = total > 0 ? ((p.missed / total) * 100).toFixed(0) + '%' : '0%';
        const color = TASK_COLORS[idx % TASK_COLORS.length];

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600; color:${color}">${id}</td>
            <td>${p.released}</td>
            <td>${p.completed}</td>
            <td>${p.missed}</td>
            <td>${avg(p.turnarounds)}</td>
            <td>${avg(p.waits)}</td>
            <td>${avg(p.responses)}</td>
            <td><span class="badge ${p.missed > 0 ? 'badge--missed' : 'badge--met'}">${missRate}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Draw analytics bar chart
    drawAnalyticsChart(taskIds, perTask);
}

function drawAnalyticsChart(taskIds, perTask) {
    const canvas = document.getElementById('analytics-chart');
    const container = canvas.parentElement;
    const emptyMsg = document.getElementById('analytics-chart-empty');
    emptyMsg.style.display = 'none';

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = 250;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 30, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const metrics = ['Avg Turnaround', 'Avg Waiting', 'Avg Response'];
    const metricColors = ['#3b82f6', '#f59e0b', '#06b6d4'];

    const groupWidth = chartW / taskIds.length;
    const barWidth = Math.min(groupWidth / (metrics.length + 1), 25);

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Find max value
    let maxVal = 1;
    taskIds.forEach(id => {
        const p = perTask[id];
        maxVal = Math.max(maxVal, avg(p.turnarounds), avg(p.waits), avg(p.responses));
    });
    maxVal *= 1.15;

    // Draw gridlines
    ctx.strokeStyle = 'rgba(99,115,170,0.1)';
    ctx.lineWidth = 1;
    ctx.font = '9px Inter';
    ctx.fillStyle = '#5a6380';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const y = padT + chartH - (i / 4) * chartH;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
        ctx.fillText((maxVal * i / 4).toFixed(1), padL - 6, y);
    }

    // Draw bars
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    taskIds.forEach((id, gi) => {
        const p = perTask[id];
        const vals = [avg(p.turnarounds), avg(p.waits), avg(p.responses)];
        const groupX = padL + gi * groupWidth + groupWidth / 2;

        // Task label
        ctx.fillStyle = TASK_COLORS[gi % TASK_COLORS.length];
        ctx.font = 'bold 10px Inter';
        ctx.fillText(id, groupX, padT + chartH + 8);

        vals.forEach((val, mi) => {
            const barH = (val / maxVal) * chartH;
            const x = groupX - (metrics.length * barWidth) / 2 + mi * barWidth;
            const y = padT + chartH - barH;

            ctx.fillStyle = metricColors[mi];
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x, y, barWidth - 2, barH);
            ctx.globalAlpha = 1;
        });
    });

    // Mini legend
    ctx.font = '9px Inter';
    metrics.forEach((m, i) => {
        const x = padL + i * 110;
        ctx.fillStyle = metricColors[i];
        ctx.fillRect(x, padT - 18, 10, 10);
        ctx.fillStyle = '#8892b0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(m, x + 14, padT - 13);
    });
}


// ══════════════════════════════════════════
// ── COMPARE ALL ──
// ══════════════════════════════════════════

document.getElementById('btn-compare').addEventListener('click', async () => {
    if (tasks.length === 0) {
        alert('Add tasks first.');
        return;
    }

    const algos = ['RM', 'EDF', 'FCFS', 'SJF'];
    const algoNames = { RM: 'Rate Monotonic', EDF: 'EDF', FCFS: 'FCFS', SJF: 'SJF' };
    const totalTime = Math.max(30, Math.max(...tasks.map(t => t.period * 3 || 50)));
    const results = {};

    for (const algo of algos) {
        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ algorithm: algo, total_time: totalTime, tasks })
            });
            const data = await response.json();
            results[algo] = data.stats;
        } catch (e) {
            results[algo] = null;
        }
    }

    // ── Populate Compare Table ──
    const tbody = document.getElementById('compare-tbody');
    const emptyMsg = document.getElementById('compare-empty');
    tbody.innerHTML = '';
    emptyMsg.style.display = 'none';

    const metricsRows = [
        { label: 'CPU Utilization (%)', key: 'cpu_utilization', higher: true },
        { label: 'Avg Turnaround Time', key: 'avg_turnaround', higher: false },
        { label: 'Avg Waiting Time', key: 'avg_waiting', higher: false },
        { label: 'Avg Response Time', key: 'avg_response', higher: false },
        { label: 'Missed Deadlines', key: 'total_missed', higher: false },
        { label: 'Total Preemptions', key: 'total_preemptions', higher: false },
        { label: 'Completed Jobs', key: 'total_completed', higher: true },
    ];

    metricsRows.forEach(metric => {
        const vals = algos.map(a => results[a] ? results[a][metric.key] : null);
        const validVals = vals.filter(v => v !== null);
        const best = metric.higher ? Math.max(...validVals) : Math.min(...validVals);
        const worst = metric.higher ? Math.min(...validVals) : Math.max(...validVals);

        const tr = document.createElement('tr');
        let html = `<td style="font-weight:600;">${metric.label}</td>`;
        algos.forEach((a, i) => {
            const v = vals[i];
            if (v === null) {
                html += '<td>—</td>';
            } else {
                let cls = '';
                if (v === best && validVals.length > 1) cls = 'compare-best';
                else if (v === worst && validVals.length > 1 && best !== worst) cls = 'compare-worst';
                html += `<td class="${cls}">${v}</td>`;
            }
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    // ── Draw Compare Chart ──
    drawCompareChart(algos, results);

    // Scroll to compare section
    document.getElementById('compare-section').scrollIntoView({ behavior: 'smooth' });
});

function drawCompareChart(algos, results) {
    const canvas = document.getElementById('compare-chart');
    const container = canvas.parentElement;
    const emptyMsg = document.getElementById('compare-chart-empty');
    emptyMsg.style.display = 'none';

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = 250;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 30, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const algoColors = { RM: '#00d4aa', EDF: '#3b82f6', FCFS: '#f97316', SJF: '#eab308' };
    const metrics = ['avg_turnaround', 'avg_waiting', 'avg_response'];
    const metricLabels = ['Avg Turnaround', 'Avg Waiting', 'Avg Response'];

    const groupWidth = chartW / metrics.length;
    const barWidth = Math.min(groupWidth / (algos.length + 1), 30);

    let maxVal = 1;
    algos.forEach(a => {
        if (!results[a]) return;
        metrics.forEach(m => { maxVal = Math.max(maxVal, results[a][m] || 0); });
    });
    maxVal *= 1.15;

    // Grid
    ctx.strokeStyle = 'rgba(99,115,170,0.1)';
    ctx.lineWidth = 1;
    ctx.font = '9px Inter';
    ctx.fillStyle = '#5a6380';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const y = padT + chartH - (i / 4) * chartH;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
        ctx.fillText((maxVal * i / 4).toFixed(1), padL - 6, y);
    }

    // Bars
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    metrics.forEach((metric, gi) => {
        const groupX = padL + gi * groupWidth + groupWidth / 2;

        ctx.fillStyle = '#8892b0';
        ctx.font = '10px Inter';
        ctx.fillText(metricLabels[gi], groupX, padT + chartH + 8);

        algos.forEach((algo, ai) => {
            if (!results[algo]) return;
            const val = results[algo][metric] || 0;
            const barH = (val / maxVal) * chartH;
            const x = groupX - (algos.length * barWidth) / 2 + ai * barWidth;
            const y = padT + chartH - barH;

            ctx.fillStyle = algoColors[algo];
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x, y, barWidth - 2, barH);
            ctx.globalAlpha = 1;
        });
    });

    // Legend
    ctx.font = '9px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    algos.forEach((a, i) => {
        const x = padL + i * 90;
        ctx.fillStyle = algoColors[a];
        ctx.fillRect(x, padT - 18, 10, 10);
        ctx.fillStyle = '#8892b0';
        ctx.fillText(a, x + 14, padT - 13);
    });
}


// ══════════════════════════════════════════
// ── NAVBAR NAVIGATION ──
// ══════════════════════════════════════════

document.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
            // Update active state
            document.querySelectorAll('.navbar__link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });
});

// ── Initial render ──
renderTaskTable();

