from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Backend Live"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    try:
        f = request.files["file"]
        # Fast processing: Limit rows to avoid RAM crash
        df = pd.read_csv(f, nrows=100000)
        
        # Column names normalize karein
        df.columns = [c.strip().title() for c in df.columns]
        
        req = ['State', 'District', 'Tehsil', 'Enrolment']
        if not all(col in df.columns for col in req):
            return jsonify({"error": f"Missing columns. Need: {', '.join(req)}"}), 400
        
        # Clean Enrolment data
        df['Enrolment'] = pd.to_numeric(df['Enrolment'], errors='coerce').fillna(0)
        
        # Grouping for hierarchy
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_v = grouped['Enrolment'].mean()
        
        results = []
        for _, r in grouped.iterrows():
            enrol = int(r['Enrolment'])
            # R-Y-G Logic
            code = "G"
            if enrol < (avg_v * 0.5): code = "R"
            elif enrol < avg_v: code = "Y"
            
            results.append({
                "place": f"{r['State']} > {r['District']} > {r['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else "Stable"
            })
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
