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
        # Optimization: Sirf zaroori columns read karein taaki RAM na bhare
        cols = ['State', 'District', 'Tehsil', 'Enrolment']
        
        # 10 Lakh rows ko handle karne ke liye chunks use kar rahe hain
        chunk_list = []
        for chunk in pd.read_csv(file, usecols=cols, chunksize=300000):
            chunk.columns = [c.strip() for c in chunk.columns]
            # Har chunk ko turant aggregate karke chota kar dein
            summary = chunk.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
            chunk_list.append(summary)

        # Final Merging
        df = pd.concat(chunk_list).groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = df['Enrolment'].mean()
        
        results = []
        # JSON size chota rakhne ke liye sirf unique regions bhej rahe hain
        for _, row in df.iterrows():
            enrol = int(row['Enrolment'])
            code = "R" if enrol < (avg_val * 0.5) else ("Y" if enrol < avg_val else "G")
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Warning" if code == "Y" else "Stable")
            })

        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
