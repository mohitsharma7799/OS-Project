// ── Main Application Logic ──

const TASK_COLORS = [
    '#f87171', '#60a5fa', '#a78bfa', '#34d399',
    '#fbbf24', '#f472b6', '#22d3ee', '#fb923c'
];

let tasks = [];
let selectedRows = new Set();
let nextAutoId = 1;
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
        document.getElementById('stat-wait').textContent = stats.avg_waiting;

        // Render results table
        renderResults(data.completed_jobs);

        // Draw Gantt chart
        document.getElementById('gantt-empty').classList.add('hidden');
        window.GanttVisualizer.draw(data, totalTime, tasks);

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
    // Step through execution log one unit at a time
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

// ── Pause/Resume (resets step) ──
document.getElementById('btn-pause').addEventListener('click', () => {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = isPaused ? '▶ Resume' : '⏸ Pause/Resume';
    stepIndex = 0;
});

// ── Compare All ──
document.getElementById('btn-compare').addEventListener('click', async () => {
    if (tasks.length === 0) {
        alert('Add tasks first.');
        return;
    }

    const algos = ['RM', 'EDF', 'FCFS', 'SJF'];
    const totalTime = Math.max(30, Math.max(...tasks.map(t => t.period * 3 || 50)));
    const results = [];

    for (const algo of algos) {
        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ algorithm: algo, total_time: totalTime, tasks })
            });
            const data = await response.json();
            results.push({ algorithm: algo, stats: data.stats });
        } catch (e) {
            results.push({ algorithm: algo, stats: null });
        }
    }

    // Show comparison in results table
    const tbody = document.getElementById('result-tbody');
    const emptyMsg = document.getElementById('result-empty');
    tbody.innerHTML = '';
    emptyMsg.style.display = 'none';

    // Change header temporarily
    const thead = document.querySelector('#result-table thead tr');
    thead.innerHTML = `
        <th>Algorithm</th>
        <th>CPU %</th>
        <th>Avg Turn.</th>
        <th>Avg Wait</th>
        <th>Missed</th>
        <th>Preemptions</th>
    `;

    results.forEach(r => {
        const tr = document.createElement('tr');
        if (r.stats) {
            tr.innerHTML = `
                <td style="font-weight:700;">${r.algorithm}</td>
                <td>${r.stats.cpu_utilization}%</td>
                <td>${r.stats.avg_turnaround}</td>
                <td>${r.stats.avg_waiting}</td>
                <td>${r.stats.total_missed}</td>
                <td>${r.stats.total_preemptions}</td>
            `;
        } else {
            tr.innerHTML = `<td>${r.algorithm}</td><td colspan="5">Error</td>`;
        }
        tbody.appendChild(tr);
    });
});

// ── Initial render ──
renderTaskTable();
