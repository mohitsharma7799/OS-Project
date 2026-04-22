// ── Gantt Chart Visualizer ──

const GANTT_COLORS = [
    '#f87171', '#60a5fa', '#a78bfa', '#34d399',
    '#fbbf24', '#f472b6', '#22d3ee', '#fb923c'
];

window.GanttVisualizer = {

    lastData: null,
    lastTotalTime: null,
    lastTasks: null,

    draw(scheduleData, totalTime, tasks) {
        this.lastData = scheduleData;
        this.lastTotalTime = totalTime;
        this.lastTasks = tasks;

        const canvas = document.getElementById('gantt-canvas');
        const container = canvas.parentElement;
        const ctx = canvas.getContext('2d');

        // High-DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = 300 * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = '300px';
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = 300;
        ctx.clearRect(0, 0, W, H);

        if (!tasks || tasks.length === 0) return;

        // Layout
        const padL = 55, padR = 15, padT = 25, padB = 35;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const unitW = chartW / totalTime;
        const rowH = Math.min(chartH / tasks.length, 50);
        const actualChartH = rowH * tasks.length;

        const taskIds = tasks.map(t => t.id);
        const colorMap = {};
        taskIds.forEach((id, i) => { colorMap[id] = GANTT_COLORS[i % GANTT_COLORS.length]; });

        // ── Background grid ──
        ctx.save();

        // Row separators
        for (let i = 0; i <= tasks.length; i++) {
            const y = padT + i * rowH;
            ctx.strokeStyle = 'rgba(99, 115, 170, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + chartW, y);
            ctx.stroke();
        }

        // Alternating row backgrounds
        for (let i = 0; i < tasks.length; i++) {
            if (i % 2 === 1) {
                ctx.fillStyle = 'rgba(99, 115, 170, 0.03)';
                ctx.fillRect(padL, padT + i * rowH, chartW, rowH);
            }
        }

        // Vertical time gridlines
        const step = totalTime <= 15 ? 1 : (totalTime <= 40 ? 2 : (totalTime <= 80 ? 5 : 10));
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let t = 0; t <= totalTime; t += step) {
            const x = padL + t * unitW;
            ctx.strokeStyle = 'rgba(99, 115, 170, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padT);
            ctx.lineTo(x, padT + actualChartH);
            ctx.stroke();

            ctx.fillStyle = '#5a6380';
            ctx.fillText(t.toString(), x, padT + actualChartH + 6);
        }
        ctx.restore();

        // ── Y-axis labels ──
        ctx.save();
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        taskIds.forEach((id, i) => {
            ctx.fillStyle = colorMap[id];
            ctx.fillText(id, padL - 8, padT + i * rowH + rowH / 2);
        });
        ctx.restore();

        // ── Execution blocks with animation-style rendering ──
        if (scheduleData.execution_log) {
            scheduleData.execution_log.forEach(log => {
                if (!log.task_id) return;
                const idx = taskIds.indexOf(log.task_id);
                if (idx === -1) return;

                const x = padL + log.time * unitW;
                const y = padT + idx * rowH + rowH * 0.15;
                const w = unitW;
                const h = rowH * 0.7;
                const color = colorMap[log.task_id];

                // Filled block
                ctx.save();
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.9;
                this._roundRect(ctx, x + 0.5, y, Math.max(w - 1, 1), h, 2);
                ctx.fill();

                // Subtle top highlight
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#fff';
                ctx.fillRect(x + 1, y, Math.max(w - 2, 1), h * 0.3);
                ctx.globalAlpha = 1;
                ctx.restore();
            });
        }

        // ── Deadline markers ──
        if (scheduleData.deadline_markers) {
            scheduleData.deadline_markers.forEach(dm => {
                const idx = taskIds.indexOf(dm.task_id);
                if (idx === -1) return;

                const x = padL + dm.time * unitW;
                const yTop = padT + idx * rowH;

                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.5;
                ctx.setLineDash([3, 2]);
                ctx.beginPath();
                ctx.moveTo(x, yTop);
                ctx.lineTo(x, yTop + rowH);
                ctx.stroke();
                ctx.setLineDash([]);

                // Triangle marker
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(x - 4, yTop + 1);
                ctx.lineTo(x + 4, yTop + 1);
                ctx.lineTo(x, yTop + 7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }

        // ── Preemption markers ──
        if (scheduleData.preemptions) {
            scheduleData.preemptions.forEach(p => {
                const idx = taskIds.indexOf(p.preempted_task);
                if (idx === -1) return;

                const x = padL + p.time * unitW;
                const y = padT + idx * rowH + rowH * 0.08;

                ctx.save();
                ctx.fillStyle = '#eab308';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚡', x, y);
                ctx.restore();
            });
        }

        // ── Missed deadline markers ──
        if (scheduleData.missed_deadlines) {
            scheduleData.missed_deadlines.forEach(m => {
                const idx = taskIds.indexOf(m.task_id);
                if (idx === -1) return;

                const x = padL + m.time * unitW;
                const y = padT + idx * rowH + rowH * 0.5;
                const s = 6;

                ctx.save();
                // Glow
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.25)';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x - s, y - s);
                ctx.lineTo(x + s, y + s);
                ctx.moveTo(x + s, y - s);
                ctx.lineTo(x - s, y + s);
                ctx.stroke();

                // X mark
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(x - s, y - s);
                ctx.lineTo(x + s, y + s);
                ctx.moveTo(x + s, y - s);
                ctx.lineTo(x - s, y + s);
                ctx.stroke();
                ctx.restore();
            });
        }

        // Build legend
        this._buildLegend(taskIds, colorMap);

        // Tooltip
        this._setupTooltip(canvas, padL, padT, unitW, rowH, taskIds, scheduleData, totalTime);
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _buildLegend(taskIds, colorMap) {
        const legend = document.getElementById('legend');
        legend.innerHTML = '';

        taskIds.forEach(id => {
            const el = document.createElement('div');
            el.className = 'legend__item';
            el.innerHTML = `<span class="legend__dot" style="background:${colorMap[id]}"></span> ${id}`;
            legend.appendChild(el);
        });

        [
            { sym: '▼', color: '#ef4444', label: 'Deadline' },
            { sym: '⚡', color: '#eab308', label: 'Preemption' },
            { sym: '✕', color: '#ff0000', label: 'Missed' }
        ].forEach(m => {
            const el = document.createElement('div');
            el.className = 'legend__item';
            el.innerHTML = `<span class="legend__sym" style="color:${m.color}">${m.sym}</span> ${m.label}`;
            legend.appendChild(el);
        });
    },

    _setupTooltip(canvas, padL, padT, unitW, rowH, taskIds, data, totalTime) {
        const tooltip = document.getElementById('tooltip');
        const container = canvas.parentElement;

        const handler = (e) => {
            const rect = container.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const t = Math.floor((mx - padL) / unitW);
            const row = Math.floor((my - padT) / rowH);

            if (t < 0 || t >= totalTime || row < 0 || row >= taskIds.length) {
                tooltip.classList.remove('visible');
                return;
            }

            const target = taskIds[row];
            const log = data.execution_log.find(l => l.time === t && l.task_id === target);

            if (log) {
                tooltip.innerHTML = `<strong>${log.task_id}</strong> (${log.job_id}) — t=${log.time}`;
                tooltip.style.left = (mx + 14) + 'px';
                tooltip.style.top = (my - 8) + 'px';
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }
        };

        // Clean up old listener
        canvas.removeEventListener('mousemove', canvas._tooltipHandler);
        canvas._tooltipHandler = handler;
        canvas.addEventListener('mousemove', handler);
        canvas.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
    },

    redraw() {
        if (this.lastData) {
            this.draw(this.lastData, this.lastTotalTime, this.lastTasks);
        }
    }
};

window.addEventListener('resize', () => window.GanttVisualizer.redraw());
