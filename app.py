from flask import Flask, render_template, request, jsonify
from src.scheduler import simulate, ALGORITHM_NAMES

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html', algorithms=ALGORITHM_NAMES)


@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    data = request.json
    algorithm = data.get('algorithm', 'RM')
    tasks_data = data.get('tasks', [])
    total_time = data.get('total_time', 50)

    if not tasks_data:
        return jsonify({'error': 'No tasks provided'}), 400

    try:
        result = simulate(algorithm, tasks_data, total_time)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Simulation error: {str(e)}'}), 500


@app.route('/api/algorithms', methods=['GET'])
def get_algorithms():
    return jsonify(ALGORITHM_NAMES)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
