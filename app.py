from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Hierarchy Engine Live"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files["file"]
    try:
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]

        # Grouping for Hierarchy
        hierarchy = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = hierarchy['Enrolment'].mean()
        
        results = []
        for _, row in hierarchy.iterrows():
            enrol = row['Enrolment']
            if enrol < (avg_val * 0.5):
                code, analysis = "R", "Critical: Immediate intervention needed."
            elif enrol < avg_val:
                code, analysis = "Y", "Warning: Improving but slow."
            else:
                code, analysis = "G", "Stable: High saturation level."

            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(enrol),
                "code": code,
                "analysis": analysis
            })

        return jsonify({
            "patterns": results,
            "summary": {"total": int(df['Enrolment'].sum()), "count": len(results)}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
