from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Backend is Online"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: Memory optimization
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # Simple loading strategy for Render Free Tier
        df = pd.read_csv(file, usecols=cols)
        df.columns = [c.strip() for c in df.columns]
        
        # Step 2: Grouping and Analysis
        df_grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df_grouped['Enrolment'].mean()
        
        results = []
        for index, row in df_grouped.iterrows():
            enrol = int(row['Enrolment'])
            # R-Y-G Coding Logic
            status_code = "G"
            if enrol < (avg_val * 0.5): status_code = "R"
            elif enrol < avg_val: status_code = "Y"
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": status_code,
                "analysis": "Critical" if status_code == "R" else ("Moderate" if status_code == "Y" else "Stable")
            })

        return jsonify({"patterns": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
