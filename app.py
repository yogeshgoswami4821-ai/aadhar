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
        # Optimization: Sirf zaroori columns read karein
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # 10 Lakh rows ke liye chunking zaruri hai
        chunk_list = []
        for chunk in pd.read_csv(file, usecols=cols, chunksize=200000):
            # YAHAN ERROR THI: Ab ye line sahi indented hai
            chunk.columns = [c.strip() for c in chunk.columns]
            
            # Turant data chota karein memory bachane ke liye
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Saare chunks merge karein
        df = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df['Enrolment'].mean()
        
        results = []
        for _, row in df.iterrows():
            enrol = int(row['Enrolment'])
            # Predictive Status Coding (R, Y, G)
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical Problem" if code == "R" else ("Warning" if code == "Y" else "Stable Pattern")
            })

        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
