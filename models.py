import math

class Task:
    """Represents a periodic or aperiodic real-time task."""
    def __init__(self, task_id, name, arrival_time, execution_time, period=None, deadline=None):
        self.task_id = task_id
        self.name = name
        self.arrival_time = int(arrival_time)
        self.execution_time = int(execution_time)
        self.period = int(period) if period else None
        self.deadline = int(deadline) if deadline else self.period

    def is_periodic(self):
        return self.period is not None and self.period > 0

    def to_dict(self):
        return {
            'id': self.task_id,
            'name': self.name,
            'arrival_time': self.arrival_time,
            'execution_time': self.execution_time,
            'period': self.period,
            'deadline': self.deadline
        }


class Job:
    """A single instance (release) of a task."""
    def __init__(self, task_id, job_id, release_time, execution_time, absolute_deadline):
        self.task_id = task_id
        self.job_id = job_id
        self.release_time = release_time
        self.execution_time = execution_time
        self.remaining_time = execution_time
        self.absolute_deadline = absolute_deadline
        self.start_time = None       # First time this job ran
        self.completion_time = None   # Time it finished

    @property
    def is_complete(self):
        return self.remaining_time <= 0

    @property
    def response_time(self):
        if self.start_time is not None:
            return self.start_time - self.release_time
        return None

    @property
    def turnaround_time(self):
        if self.completion_time is not None:
            return self.completion_time - self.release_time
        return None

    @property
    def waiting_time(self):
        if self.turnaround_time is not None:
            return self.turnaround_time - self.execution_time
        return None

    @property
    def missed_deadline(self):
        if self.completion_time is not None:
            return self.completion_time > self.absolute_deadline
        return True  # Not completed = missed


class ScheduleResult:
    """Holds all output data from a scheduling simulation."""
    def __init__(self, algorithm_name):
        self.algorithm_name = algorithm_name
        self.execution_log = []      # [{time, task_id, job_id}] per unit
        self.timeline_events = []    # [{time, task_id, job_id, event}]
        self.missed_deadlines = []   # [{time, task_id, job_id}]
        self.completed_jobs = []     # List of completed Job objects info
        self.deadline_markers = []   # [{time, task_id}]
        self.preemptions = []        # [{time, preempted_task, by_task}]

    def log_exec(self, time, task_id, job_id):
        self.execution_log.append({'time': time, 'task_id': task_id, 'job_id': job_id})

    def log_event(self, time, task_id, job_id, event):
        self.timeline_events.append({'time': time, 'task_id': task_id, 'job_id': job_id, 'event': event})

    def log_missed(self, time, task_id, job_id):
        self.missed_deadlines.append({'time': time, 'task_id': task_id, 'job_id': job_id})

    def log_preemption(self, time, preempted_task, by_task):
        self.preemptions.append({'time': time, 'preempted_task': preempted_task, 'by_task': by_task})

    def log_completion(self, job):
        self.completed_jobs.append({
            'task_id': job.task_id,
            'job_id': job.job_id,
            'release_time': job.release_time,
            'start_time': job.start_time,
            'completion_time': job.completion_time,
            'waiting_time': job.waiting_time,
            'turnaround_time': job.turnaround_time,
            'response_time': job.response_time,
            'missed': job.missed_deadline
        })

    def log_deadline_marker(self, time, task_id):
        self.deadline_markers.append({'time': time, 'task_id': task_id})

    def compute_stats(self):
        completed = [j for j in self.completed_jobs if j['turnaround_time'] is not None]
        n = len(completed)
        if n == 0:
            return {'avg_waiting': 0, 'avg_turnaround': 0, 'avg_response': 0,
                    'total_missed': len(self.missed_deadlines), 'total_completed': 0,
                    'total_preemptions': len(self.preemptions), 'cpu_utilization': 0}

        return {
            'avg_waiting': round(sum(j['waiting_time'] for j in completed) / n, 2),
            'avg_turnaround': round(sum(j['turnaround_time'] for j in completed) / n, 2),
            'avg_response': round(sum(j['response_time'] for j in completed) / n, 2),
            'total_missed': len(self.missed_deadlines),
            'total_completed': n,
            'total_preemptions': len(self.preemptions),
            'cpu_utilization': round(len(self.execution_log) / max(1, max((e['time'] for e in self.execution_log), default=1) + 1) * 100, 1)
        }

    def to_dict(self):
        return {
            'algorithm': self.algorithm_name,
            'execution_log': self.execution_log,
            'timeline_events': self.timeline_events,
            'missed_deadlines': self.missed_deadlines,
            'deadline_markers': self.deadline_markers,
            'preemptions': self.preemptions,
            'completed_jobs': self.completed_jobs,
            'stats': self.compute_stats()
        }
