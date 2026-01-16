from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Aadhaar Backend is Online"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: Optimization
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        chunk_list = []
        
        # Step 2: Proper Indentation (Error yahan thi)
        for chunk in pd.read_csv(file, usecols=cols, chunksize=200000):
            # Is line ko bilkul aise hi paste karein
            chunk.columns = [c.strip() for c in chunk.columns]
            
            # Step 3: Immediate Aggregation
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Step 4: Final Merging
        df = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df['Enrolment'].mean()
        
        results = []
        for _, row in df.iterrows():
            enrol = int(row['Enrolment'])
            # R-Y-G Status Logic
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })

        return jsonify({"patterns": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
