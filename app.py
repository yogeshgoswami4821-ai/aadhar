from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files["file"]
    try:
        # Optimization: Sirf zaroori columns read karein
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # 1 Million rows ke liye "Chunking" use karein taaki server crash na ho
        chunks = pd.read_csv(file, usecols=cols, chunksize=100000)
        
        aggregated_data = pd.DataFrame()
        for chunk in chunks:
            chunk.columns = [c.strip() for c in chunk.columns]
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            aggregated_data = pd.concat([aggregated_data, summary]).groupby(['State', 'District', 'Tehsil']).sum().reset_index()

        avg_val = aggregated_data['Enrolment'].mean()
        
        results = []
        # Browser performance ke liye top 1000 results hi bhejenge
        for _, row in aggregated_data.head(1000).iterrows():
            enrol = row['Enrolment']
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            analysis = "Critical: Urgent intervention" if code == "R" else ("Warning: Slow" if code == "Y" else "Stable")

            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(enrol),
                "code": code,
                "analysis": analysis
            })

        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": "Large file processing failed. Try a smaller sample for demo."}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
