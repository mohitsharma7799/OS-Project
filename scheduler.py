from .models import Task, Job, ScheduleResult


ALGORITHM_NAMES = {
    'RM': 'Rate Monotonic',
    'EDF': 'Earliest Deadline First',
    'FCFS': 'First-Come, First-Served',
    'SJF': 'Shortest Job First',
}


def simulate(algorithm, tasks_data, total_time):
    """
    Main entry point. Parses task data, runs the chosen algorithm, returns results.
    """
    tasks = []
    for i, td in enumerate(tasks_data):
        tasks.append(Task(
            task_id=td.get('id', f'T{i+1}'),
            name=td.get('name', f'Task {i+1}'),
            arrival_time=td.get('arrival_time', 0),
            execution_time=td['execution_time'],
            period=td.get('period'),
            deadline=td.get('deadline')
        ))

    if algorithm not in ALGORITHM_NAMES:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    result = _run_simulation(algorithm, tasks, int(total_time))
    return result.to_dict()


def _run_simulation(algorithm, tasks, total_time):
    """Generic tick-by-tick simulation engine."""
    result = ScheduleResult(ALGORITHM_NAMES[algorithm])
    active_jobs = []
    job_counter = 0
    current_job = None
    is_preemptive = algorithm in ('RM', 'EDF')

    # Cache task periods for RM priority
    task_period_map = {t.task_id: t.period for t in tasks}

    def priority_key(job):
        if algorithm == 'RM':
            # Lower period = higher priority (ties broken by task_id)
            return (task_period_map.get(job.task_id) or float('inf'), job.task_id)
        elif algorithm == 'EDF':
            # Earliest absolute deadline first
            return (job.absolute_deadline, job.release_time, job.task_id)
        elif algorithm == 'FCFS':
            # Order of arrival
            return (job.release_time, job.task_id)
        elif algorithm == 'SJF':
            # Shortest burst time (non-preemptive)
            return (job.execution_time, job.release_time, job.task_id)
        return (0,)

    # Pre-generate all deadline markers for visualization
    for task in tasks:
        if task.is_periodic() and task.deadline:
            t = task.arrival_time
            while t < total_time:
                dl = t + task.deadline
                if dl <= total_time:
                    result.log_deadline_marker(dl, task.task_id)
                t += task.period
        elif task.deadline:
            dl = task.arrival_time + task.deadline
            if dl <= total_time:
                result.log_deadline_marker(dl, task.task_id)

    for t in range(total_time):
        # ── Step 1: Release new jobs ──
        for task in tasks:
            should_release = False
            if task.is_periodic():
                if t >= task.arrival_time and (t - task.arrival_time) % task.period == 0:
                    should_release = True
            else:
                if t == task.arrival_time:
                    should_release = True

            if should_release:
                job_counter += 1
                abs_deadline = t + (task.deadline if task.deadline else float('inf'))
                job = Job(task.task_id, f"J{job_counter}", t, task.execution_time, abs_deadline)
                active_jobs.append(job)
                result.log_event(t, task.task_id, job.job_id, 'release')

        # ── Step 2: Check missed deadlines (jobs still active past their deadline) ──
        newly_missed = []
        for job in active_jobs:
            if job.absolute_deadline != float('inf') and t >= job.absolute_deadline and not job.is_complete:
                result.log_missed(t, job.task_id, job.job_id)
                result.log_event(t, job.task_id, job.job_id, 'missed')
                newly_missed.append(job)

        # Remove missed jobs from active queue
        for job in newly_missed:
            if job in active_jobs:
                active_jobs.remove(job)
            if current_job == job:
                current_job = None

        # ── Step 3: Select which job to execute ──
        if not active_jobs:
            current_job = None
            result.log_exec(t, None, None)  # idle
            continue

        active_jobs.sort(key=priority_key)
        best_job = active_jobs[0]

        if is_preemptive:
            if current_job and current_job != best_job and current_job in active_jobs:
                # Preemption!
                result.log_event(t, current_job.task_id, current_job.job_id, 'preempt')
                result.log_preemption(t, current_job.task_id, best_job.task_id)
                result.log_event(t, best_job.task_id, best_job.job_id,
                                 'start' if best_job.start_time is None else 'resume')
                current_job = best_job
            elif current_job is None or current_job not in active_jobs:
                result.log_event(t, best_job.task_id, best_job.job_id,
                                 'start' if best_job.start_time is None else 'resume')
                current_job = best_job
        else:
            # Non-preemptive: stick with current if still active
            if current_job and current_job in active_jobs:
                pass  # keep running
            else:
                current_job = best_job
                result.log_event(t, best_job.task_id, best_job.job_id,
                                 'start' if best_job.start_time is None else 'resume')

        # ── Step 4: Execute one unit ──
        if current_job.start_time is None:
            current_job.start_time = t

        current_job.remaining_time -= 1
        result.log_exec(t, current_job.task_id, current_job.job_id)

        # ── Step 5: Check completion ──
        if current_job.is_complete:
            current_job.completion_time = t + 1
            result.log_event(t + 1, current_job.task_id, current_job.job_id, 'finish')
            result.log_completion(current_job)
            active_jobs.remove(current_job)
            current_job = None

    return result
