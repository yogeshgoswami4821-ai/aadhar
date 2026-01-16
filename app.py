from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Hierarchy Engine Live & Optimized"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # OPTIMIZATION: Sirf zaroori columns read karein memory bachane ke liye
        # Taaki 10 Lakh rows par server crash na ho
        df = pd.read_csv(file, usecols=['State', 'District', 'Tehsil', 'Enrolment'])
        df.columns = [c.strip() for c in df.columns]

        # Hierarchy Aggregation
        hierarchy = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = hierarchy['Enrolment'].mean()
        
        results = []
        for _, row in hierarchy.iterrows():
            enrol = row['Enrolment']
            
            # Status Coding Logic
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

        # Summary statistics for the dashboard header
        return jsonify({
            "patterns": results,
            "summary": {
                "total_enrolment": int(df['Enrolment'].sum()),
                "total_regions": len(results)
            }
        })
    except Exception as e:
        # Detailed error for debugging during hackathon
        return jsonify({"error": f"Process Failed: {str(e)}"}), 500

if __name__ == "__main__":
    # Render dynamic port support
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
