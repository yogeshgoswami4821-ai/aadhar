from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Optimization: Sirf zaroori columns read karein taaki RAM crash na ho
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # Data ko 2 lakh rows ke chunks mein read karenge taaki timeout na ho
        chunk_list = []
        for chunk in pd.read_csv(file, usecols=cols, chunksize=200000):
            chunk.columns = [c.strip() for c in chunk.columns]
            # Har chunk ko turant aggregate karein memory bachaane ke liye
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Saare aggregated chunks ko final merge karein
        df_final = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df_final['Enrolment'].mean()
        
        results = []
        # Browser performance ke liye top 1000 results hi return karenge
        for _, row in df_final.iterrows():
            enrol = row['Enrolment']
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            analysis = "Critical Problem: Low Saturation" if code == "R" else ("Warning: Moderate" if code == "Y" else "Stable Pattern")

            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(enrol),
                "code": code,
                "analysis": analysis
            })

        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
