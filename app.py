from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Hierarchy Analytics Engine Online"

@app.route("/upload", methods=["POST"])
def analyze_hierarchy():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]

        # 1. Hierarchical Aggregation
        # Required columns: State, District, Tehsil, Enrolment
        hierarchy_data = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()

        # 2. Logic: Status Coding (Place-wise Coding)
        # Target based on average to identify underperforming areas
        target_val = hierarchy_data['Enrolment'].mean()
        
        results = []
        for _, row in hierarchy_data.iterrows():
            enrol = row['Enrolment']
            
            # Pattern Assignment
            if enrol < (target_val * 0.5):
                code = "R" # Red: Critical Problem
                issue = "Low Saturation: Immediate camps required"
            elif enrol < target_val:
                code = "Y" # Yellow: Medium Pattern
                issue = "Slow Progress: Awareness needed"
            else:
                code = "G" # Green: Good Pattern
                issue = "Stable: Monitoring only"

            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(enrol),
                "code": code,
                "analysis": issue
            })

        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
