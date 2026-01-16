from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Backend is Active"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    try:
        f = request.files["file"]
        # Har tarah ki CSV read karne ke liye logic
        df = pd.read_csv(f, skipinitialspace=True)
        df.columns = [c.strip() for c in df.columns]
        
        # Enrolment ko number mein convert karna (Safety check)
        df['Enrolment'] = pd.to_numeric(df['Enrolment'], errors='coerce').fillna(0)
        
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for _, r in grouped.iterrows():
            enrol = int(r['Enrolment'])
            # R-Y-G Logic
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{r['State']} > {r['District']} > {r['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
