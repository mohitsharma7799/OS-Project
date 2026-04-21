import copy
import tkinter as tk
from tkinter import ttk, messagebox

try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except Exception:
    MATPLOTLIB_AVAILABLE = True


class Task:
    def __init__(self, task_id, arrival, burst, deadline, period):
        self.task_id = str(task_id)
        self.arrival = int(arrival)
        self.burst = int(burst)
        self.deadline = int(deadline)
        self.period = int(period) if period not in (None, "") else 0
        self.remaining = int(burst)
        self.completion = None
        self.turnaround = 0
        self.waiting = 0
        self.response = None
        self.started = False
        self.status = "Pending"

    def clone(self):
        return copy.deepcopy(self)


def clone_tasks(tasks):
    return [task.clone() for task in tasks]


def choose_task(ready_tasks, current_time, algorithm):
    if not ready_tasks:
        return None

    if algorithm == "EDF":
        ready_tasks.sort(key=lambda x: (x.deadline, x.arrival, x.task_id))
    elif algorithm == "RMS":
        ready_tasks.sort(key=lambda x: (x.period if x.period > 0 else 10**9, x.arrival, x.task_id))
    elif algorithm == "LLF":
        ready_tasks.sort(
            key=lambda x: (
                x.deadline - current_time - x.remaining,
                x.deadline,
                x.arrival,
                x.task_id,
            )
        )
    else:
        ready_tasks.sort(key=lambda x: (x.arrival, x.task_id))

    return ready_tasks[0]


def simulate(tasks, algorithm):
    sim_tasks = clone_tasks(tasks)
    timeline = []
    current_time = 0
    completed = 0
    n = len(sim_tasks)

    if n == 0:
        return sim_tasks, timeline, {"cpu_utilization": 0, "deadline_met": 0, "deadline_missed": 0}

    while completed < n:
        ready = [t for t in sim_tasks if t.arrival <= current_time and t.remaining > 0]

        if not ready:
            timeline.append((current_time, "Idle"))
            current_time += 1
            continue

        current_task = choose_task(ready, current_time, algorithm)

        if not current_task.started:
            current_task.response = current_time - current_task.arrival
            current_task.started = True

        timeline.append((current_time, current_task.task_id))
        current_task.remaining -= 1
        current_time += 1

        if current_task.remaining == 0:
            current_task.completion = current_time
            current_task.turnaround = current_task.completion - current_task.arrival
            current_task.waiting = current_task.turnaround - current_task.burst
            current_task.status = "Met" if current_task.completion <= current_task.deadline else "Missed"
            completed += 1

    busy_time = sum(1 for _, task_name in timeline if task_name != "Idle")
    total_time = len(timeline)
    deadline_met = sum(1 for t in sim_tasks if t.status == "Met")
    deadline_missed = sum(1 for t in sim_tasks if t.status == "Missed")
    avg_waiting = sum(t.waiting for t in sim_tasks) / n
    avg_turnaround = sum(t.turnaround for t in sim_tasks) / n
    avg_response = sum((t.response if t.response is not None else 0) for t in sim_tasks) / n

    metrics = {
        "cpu_utilization": (busy_time / total_time) * 100 if total_time else 0,
        "deadline_met": deadline_met,
        "deadline_missed": deadline_missed,
        "avg_waiting": avg_waiting,
        "avg_turnaround": avg_turnaround,
        "avg_response": avg_response,
        "total_time": total_time,
    }
    return sim_tasks, timeline, metrics


def compress_timeline(timeline):
    if not timeline:
        return []

    blocks = []
    start = timeline[0][0]
    current_task = timeline[0][1]

    for i in range(1, len(timeline)):
        time, task = timeline[i]
        if task != current_task:
            blocks.append((start, time, current_task))
            start = time
            current_task = task

    blocks.append((start, timeline[-1][0] + 1, current_task))
    return blocks


class SchedulerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Real-Time Scheduling Algorithm Simulator")
        self.root.geometry("1250x760")

        self.tasks = []
        self.last_timeline = []
        self.last_algorithm = None

        self.build_ui()

    def build_ui(self):
        title = tk.Label(
            self.root,
            text="Real-Time Scheduling Algorithm Simulator",
            font=("Arial", 18, "bold"),
            pady=10,
        )
        title.pack()

        top_frame = tk.Frame(self.root)
        top_frame.pack(fill="x", padx=10, pady=5)

        input_frame = tk.LabelFrame(top_frame, text="Task Input", padx=10, pady=10)
        input_frame.pack(side="left", fill="both", expand=True, padx=5)

        tk.Label(input_frame, text="Task ID").grid(row=0, column=0, padx=5, pady=5)
        tk.Label(input_frame, text="Arrival Time").grid(row=0, column=1, padx=5, pady=5)
        tk.Label(input_frame, text="Burst Time").grid(row=0, column=2, padx=5, pady=5)
        tk.Label(input_frame, text="Deadline").grid(row=0, column=3, padx=5, pady=5)
        tk.Label(input_frame, text="Period (for RMS)").grid(row=0, column=4, padx=5, pady=5)

        self.task_id_entry = tk.Entry(input_frame, width=10)
        self.arrival_entry = tk.Entry(input_frame, width=10)
        self.burst_entry = tk.Entry(input_frame, width=10)
        self.deadline_entry = tk.Entry(input_frame, width=10)
        self.period_entry = tk.Entry(input_frame, width=12)

        self.task_id_entry.grid(row=1, column=0, padx=5, pady=5)
        self.arrival_entry.grid(row=1, column=1, padx=5, pady=5)
        self.burst_entry.grid(row=1, column=2, padx=5, pady=5)
        self.deadline_entry.grid(row=1, column=3, padx=5, pady=5)
        self.period_entry.grid(row=1, column=4, padx=5, pady=5)

        tk.Button(input_frame, text="Add Task", command=self.add_task, width=14).grid(row=2, column=0, pady=10)
        tk.Button(input_frame, text="Delete Selected", command=self.delete_task, width=14).grid(row=2, column=1, pady=10)
        tk.Button(input_frame, text="Load Sample", command=self.load_sample, width=14).grid(row=2, column=2, pady=10)
        tk.Button(input_frame, text="Reset All", command=self.reset_all, width=14).grid(row=2, column=3, pady=10)

        algo_frame = tk.LabelFrame(top_frame, text="Simulation Control", padx=10, pady=10)
        algo_frame.pack(side="right", fill="y", padx=5)

        tk.Label(algo_frame, text="Select Algorithm").pack(anchor="w")
        self.algorithm_var = tk.StringVar(value="EDF")
        algo_menu = ttk.Combobox(
            algo_frame,
            textvariable=self.algorithm_var,
            values=["EDF", "RMS", "LLF"],
            state="readonly",
            width=15,
        )
        algo_menu.pack(pady=8)

        tk.Button(algo_frame, text="Run Simulation", command=self.run_simulation, width=18).pack(pady=5)
        tk.Button(algo_frame, text="Compare All", command=self.compare_algorithms, width=18).pack(pady=5)
        tk.Button(algo_frame, text="Show Gantt Chart", command=self.show_gantt_chart, width=18).pack(pady=5)

        middle_frame = tk.Frame(self.root)
        middle_frame.pack(fill="both", expand=True, padx=10, pady=5)

        task_frame = tk.LabelFrame(middle_frame, text="Task List")
        task_frame.pack(side="left", fill="both", expand=True, padx=5)

        self.task_tree = ttk.Treeview(
            task_frame,
            columns=("Task", "Arrival", "Burst", "Deadline", "Period"),
            show="headings",
            height=12,
        )
        for col in ("Task", "Arrival", "Burst", "Deadline", "Period"):
            self.task_tree.heading(col, text=col)
            self.task_tree.column(col, width=90, anchor="center")
        self.task_tree.pack(fill="both", expand=True, padx=5, pady=5)

        result_frame = tk.LabelFrame(middle_frame, text="Simulation Result")
        result_frame.pack(side="right", fill="both", expand=True, padx=5)

        self.result_tree = ttk.Treeview(
            result_frame,
            columns=("Task", "Completion", "Turnaround", "Waiting", "Response", "Status"),
            show="headings",
            height=12,
        )
        for col in ("Task", "Completion", "Turnaround", "Waiting", "Response", "Status"):
            self.result_tree.heading(col, text=col)
            self.result_tree.column(col, width=100, anchor="center")
        self.result_tree.pack(fill="both", expand=True, padx=5, pady=5)

        bottom_frame = tk.Frame(self.root)
        bottom_frame.pack(fill="both", expand=True, padx=10, pady=5)

        summary_frame = tk.LabelFrame(bottom_frame, text="Summary Metrics", padx=10, pady=10)
        summary_frame.pack(side="left", fill="both", expand=True, padx=5)

        self.summary_text = tk.Text(summary_frame, height=10, width=45)
        self.summary_text.pack(fill="both", expand=True)

        timeline_frame = tk.LabelFrame(bottom_frame, text="Timeline", padx=10, pady=10)
        timeline_frame.pack(side="right", fill="both", expand=True, padx=5)

        self.timeline_text = tk.Text(timeline_frame, height=10, width=70)
        self.timeline_text.pack(fill="both", expand=True)

    def add_task(self):
        try:
            task_id = self.task_id_entry.get().strip()
            arrival = int(self.arrival_entry.get().strip())
            burst = int(self.burst_entry.get().strip())
            deadline = int(self.deadline_entry.get().strip())
            period_text = self.period_entry.get().strip()
            period = int(period_text) if period_text else 0

            if not task_id:
                raise ValueError("Task ID is required.")
            if arrival < 0 or burst <= 0 or deadline < 0 or period < 0:
                raise ValueError("Invalid numeric values.")

            for task in self.tasks:
                if task.task_id == task_id:
                    raise ValueError("Task ID must be unique.")

            task = Task(task_id, arrival, burst, deadline, period)
            self.tasks.append(task)
            self.refresh_task_table()
            self.clear_input_fields()
        except ValueError as e:
            messagebox.showerror("Input Error", str(e))

    def delete_task(self):
        selected = self.task_tree.selection()
        if not selected:
            messagebox.showwarning("Warning", "Please select a task to delete.")
            return

        item = selected[0]
        task_id = self.task_tree.item(item, "values")[0]
        self.tasks = [task for task in self.tasks if task.task_id != task_id]
        self.refresh_task_table()

    def load_sample(self):
        self.tasks = [
            Task("P1", 0, 3, 7, 4),
            Task("P2", 1, 2, 5, 5),
            Task("P3", 2, 1, 4, 6),
            Task("P4", 3, 2, 9, 8),
        ]
        self.refresh_task_table()
        self.clear_outputs()

    def reset_all(self):
        self.tasks.clear()
        self.last_timeline = []
        self.last_algorithm = None
        self.refresh_task_table()
        self.clear_input_fields()
        self.clear_outputs()

    def refresh_task_table(self):
        for row in self.task_tree.get_children():
            self.task_tree.delete(row)
        for task in self.tasks:
            self.task_tree.insert(
                "", "end",
                values=(task.task_id, task.arrival, task.burst, task.deadline, task.period)
            )

    def clear_input_fields(self):
        self.task_id_entry.delete(0, tk.END)
        self.arrival_entry.delete(0, tk.END)
        self.burst_entry.delete(0, tk.END)
        self.deadline_entry.delete(0, tk.END)
        self.period_entry.delete(0, tk.END)

    def clear_outputs(self):
        for row in self.result_tree.get_children():
            self.result_tree.delete(row)
        self.summary_text.delete("1.0", tk.END)
        self.timeline_text.delete("1.0", tk.END)

    def run_simulation(self):
        if not self.tasks:
            messagebox.showwarning("Warning", "Please add at least one task.")
            return

        algorithm = self.algorithm_var.get()
        result_tasks, timeline, metrics = simulate(self.tasks, algorithm)
        self.last_timeline = timeline
        self.last_algorithm = algorithm

        self.clear_outputs()

        for task in sorted(result_tasks, key=lambda x: x.task_id):
            self.result_tree.insert(
                "", "end",
                values=(
                    task.task_id,
                    task.completion,
                    task.turnaround,
                    task.waiting,
                    task.response,
                    task.status,
                ),
            )

        summary = []
        summary.append(f"Algorithm: {algorithm}")
        summary.append(f"CPU Utilization: {metrics['cpu_utilization']:.2f}%")
        summary.append(f"Deadlines Met: {metrics['deadline_met']}")
        summary.append(f"Deadlines Missed: {metrics['deadline_missed']}")
        summary.append(f"Average Waiting Time: {metrics['avg_waiting']:.2f}")
        summary.append(f"Average Turnaround Time: {metrics['avg_turnaround']:.2f}")
        summary.append(f"Average Response Time: {metrics['avg_response']:.2f}")
        summary.append(f"Total Simulation Time: {metrics['total_time']}")
        self.summary_text.insert(tk.END, "\n".join(summary))

        timeline_line = " | ".join([f"{time}:{task}" for time, task in timeline])
        self.timeline_text.insert(tk.END, timeline_line)

    def compare_algorithms(self):
        if not self.tasks:
            messagebox.showwarning("Warning", "Please add at least one task.")
            return

        results = []
        for algo in ["EDF", "RMS", "LLF"]:
            _, _, metrics = simulate(self.tasks, algo)
            results.append(
                f"{algo}\n"
                f"  CPU Utilization: {metrics['cpu_utilization']:.2f}%\n"
                f"  Deadlines Met: {metrics['deadline_met']}\n"
                f"  Deadlines Missed: {metrics['deadline_missed']}\n"
                f"  Avg Waiting: {metrics['avg_waiting']:.2f}\n"
                f"  Avg Turnaround: {metrics['avg_turnaround']:.2f}\n"
                f"  Avg Response: {metrics['avg_response']:.2f}\n"
            )

        self.summary_text.delete("1.0", tk.END)
        self.summary_text.insert(tk.END, "\n".join(results))

    def show_gantt_chart(self):
        if not self.last_timeline:
            messagebox.showwarning("Warning", "Please run a simulation first.")
            return

        if not MATPLOTLIB_AVAILABLE:
            messagebox.showerror(
                "Missing Library",
                "matplotlib is not installed. Install it using: pip install matplotlib"
            )
            return

        blocks = compress_timeline(self.last_timeline)

        fig, ax = plt.subplots(figsize=(11, 2.8))
        y = 10
        height = 6

        label_positions = {}
        for start, end, task_name in blocks:
            ax.broken_barh([(start, end - start)], (y, height), edgecolors='black')
            mid = (start + end) / 2
            ax.text(mid, y + height / 2, task_name, ha='center', va='center', fontsize=9)
            label_positions[task_name] = True

        ax.set_ylim(5, 20)
        ax.set_xlim(0, max(end for _, end, _ in blocks) + 1)
        ax.set_xlabel('Time')
        ax.set_yticks([])
        ax.set_title(f'Gantt Chart - {self.last_algorithm}')
        ax.grid(True)
        plt.tight_layout()
        plt.show()


def main():
    root = tk.Tk()
    app = SchedulerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
