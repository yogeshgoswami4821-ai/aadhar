from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Backend is Live"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Use only required columns to save memory
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # Fast Chunking Logic
        chunk_list = []
        for chunk in pd.read_csv(file, usecols=cols, chunksize=300000):
            chunk.columns = [c.strip() for c in chunk.columns]
            # Pre-aggregate each chunk
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Final aggregation
        df = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df['Enrolment'].mean()
        
        results = []
        for _, row in df.iterrows():
            enrol = int(row['Enrolment'])
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Warning" if code == "Y" else "Stable")
            })
            
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": f"Memory/Processing Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
