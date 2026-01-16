from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return {"status": "Aadhaar Analytics API is Online"}

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    try:
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]
    except:
        return jsonify({"error": "Invalid CSV"}), 400

    # 1. State-wise Aggregation
    res = df.groupby("State")["Enrolment"].sum().reset_index()
    
    # 2. Societal Trend: Gender Gap Analysis
    gender_gap = df.groupby("State")["Gender"].value_counts(normalize=True).unstack().fillna(0)
    female_ratio = gender_gap.get('Female', pd.Series(0, index=gender_gap.index)).to_dict()

    # 3. Societal Trend: Migration (Address Updates)
    migration_trend = []
    if 'Update_Type' in df.columns:
        mig_data = df[df['Update_Type'] == 'Address'].groupby('State').size()
        avg_mig = mig_data.mean() if not mig_data.empty else 0
        migration_trend = mig_data[mig_data > avg_mig].index.tolist()

    return jsonify({
        "states": res["State"].tolist(),
        "enrolments": res["Enrolment"].tolist(),
        "female_ratio": female_ratio,
        "migration_hotspots": migration_trend,
        "summary": {
            "total_enrolment": int(df["Enrolment"].sum()),
            "avg_by_state": int(res["Enrolment"].mean())
        }
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
