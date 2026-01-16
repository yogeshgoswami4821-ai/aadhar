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
        # Fast processing for your sample data
        df = pd.read_csv(f)
        df.columns = [c.strip() for c in df.columns]
        
        # Grouping by State > District > Tehsil
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for i, r in grouped.iterrows():
            enrol = int(r['Enrolment'])
            # R-Y-G Logic based on average
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{r['State']} > {r['District']} > {r['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Stable" if code=="G" else ("Moderate" if code=="Y" else "Critical")
            })
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
