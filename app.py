from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Engine Operational - Ready for Big Data"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: Optimized Reading (Sirf zaroori data)
        # 10 Lakh rows ko handle karne ke liye chunksize 500,000 rakhein
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        df_list = []
        
        for chunk in pd.read_csv(file, usecols=cols, chunksize=500000):
            chunk.columns = [c.strip() for c in chunk.columns]
            # Chunk level aggregation memory bachaati hai
            df_list.append(chunk.groupby(['State', 'District', 'Tehsil']).sum().reset_index())
        
        df = pd.concat(df_list).groupby(['State', 'District', 'Tehsil']).sum().reset_index()
        
        # Step 2: Hierarchical Status Coding (R, Y, G)
        avg_val = df['Enrolment'].mean()
        
        results = []
        # Browser crash na ho isliye top results limit karein
        for _, row in df.head(1000).iterrows():
            val = row['Enrolment']
            if val < (avg_val * 0.5): code = "R"
            elif val < avg_val: code = "Y"
            else: code = "G"

            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(val),
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })

        return jsonify({
            "patterns": results,
            "summary": {"total_regions": len(df)}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
