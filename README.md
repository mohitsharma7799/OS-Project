# 🧠 Real-Time Scheduling Simulator

A web-based simulator for visualizing and understanding real-time CPU scheduling algorithms such as **Rate Monotonic (RM)** and **Earliest Deadline First (EDF)**.

This project helps users analyze **task execution**, **preemption**, **deadlines**, and **missed deadlines** through an interactive interface.

---

## 🚀 Features

* ✅ Supports multiple scheduling algorithms:

  * Rate Monotonic (RM)
  * Earliest Deadline First (EDF)
  * First-Come First-Served (FCFS)
  * Shortest Job First (SJF)

* 📊 Visual timeline of task execution

* ⏱️ Deadline tracking and missed deadline detection

* 🔁 Preemption handling (for RM & EDF)

* 🧩 Supports both periodic and non-periodic tasks

* 🌐 Interactive frontend with real-time simulation

---

## 🏗️ Project Structure

```
OS Project/
│
├── app.py                 # Flask backend
├── requirements.txt       # Dependencies
├── README.md              # Documentation
│
├── src/
│   ├── scheduler.py       # Core scheduling logic
│   ├── models.py          # Data models (Task, Job, Result)
│
├── templates/
│   └── index.html         # Frontend UI
│
├── static/
│   ├── css/style.css      # Styling
│   ├── js/main.js         # UI logic
│   ├── js/visualizer.js   # Timeline visualization
```

---

## ⚙️ How It Works

1. User inputs tasks via UI or JSON.
2. Backend (`Flask`) receives data via `/api/simulate`.
3. `scheduler.py` runs a **tick-by-tick simulation**:

   * Releases jobs
   * Assigns priorities
   * Handles preemption
   * Detects missed deadlines
4. Results are returned as JSON.
5. Frontend visualizes execution timeline.

---


## 📉 Missed Deadline Detection

The simulator automatically detects missed deadlines when:

* A job exceeds its absolute deadline
* The job is still incomplete at that time

```python
if t >= job.absolute_deadline and not job.is_complete:
    result.log_missed(...)
```

---

## 🧠 Algorithms Explained

### 🔹 Rate Monotonic (RM)

* Priority based on **shorter period**
* Fixed priority
* Preemptive

### 🔹 Earliest Deadline First (EDF)

* Priority based on **earliest deadline**
* Dynamic priority
* Optimal for CPU utilization

### 🔹 FCFS

* Executes tasks in arrival order
* Non-preemptive

### 🔹 SJF

* Executes shortest job first
* Non-preemptive

---

## 📊 Key Concepts Demonstrated

* CPU Utilization
* Task Scheduling
* Preemption
* Deadline Constraints
* Real-Time System Behavior

---

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/real-time-scheduler.git
cd real-time-scheduler
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the application

```bash
python app.py
```

### 5. Open in browser

```
http://127.0.0.1:5000
```

---

## 📌 API Endpoints

### ▶️ Run Simulation

```
POST /api/simulate
```

### 📥 Get Algorithms

```
GET /api/algorithms
```

---

## 🎯 Use Cases

* OS lab demonstrations
* Understanding real-time scheduling
* Comparing RM vs EDF
* Visualizing missed deadlines

---

## 🔮 Future Improvements

* Add more algorithms (LLF, Priority Scheduling)
* Gantt chart export
* Performance metrics (waiting time, turnaround time)
* Multi-core scheduling support

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork, improve, and submit a PR.

---

## 📜 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

Developed as part of an Operating Systems project.

---
