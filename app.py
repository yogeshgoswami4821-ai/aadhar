from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)  # Frontend (GitHub Pages) ke liye CORS allow

@app.route("/")
def home():
    return "Aadhaar Backend Running"

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return jsonify({"error": "Invalid CSV file"}), 400

    # Required columns check
    required_cols = ["State", "Enrolment"]
    for col in required_cols:
        if col not in df.columns:
            return jsonify({"error": f"Missing column: {col}"}), 400

    # State-wise aggregation
    result = (
        df.groupby("State")["Enrolment"]
        .sum()
        .reset_index()
        .sort_values(by="Enrolment", ascending=False)
    )

    return jsonify({
        "states": result["State"].tolist(),
        "enrolments": result["Enrolment"].tolist()
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
