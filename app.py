from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Aadhaar Backend Live"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: Memory optimization for 1M+ rows
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        chunk_list = []
        
        # Data ko 2 Lakh ke chunks mein process karenge
        for chunk in pd.read_csv(file, usecols=cols, chunksize=200000):
            chunk.columns = [c.strip() for c in chunk.columns]
            # Immediate aggregation to save RAM
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Step 2: Final Data Merging
        df_final = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df_final['Enrolment'].mean()
        
        results = []
        # Browser crash na ho isliye top results dikhayenge
        for _, row in df_final.iterrows():
            enrol = row['Enrolment']
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": int(enrol),
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })

        return jsonify({"patterns": results})

    except Exception as e:
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
