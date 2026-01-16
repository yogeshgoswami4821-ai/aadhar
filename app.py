from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Aadhaar Backend Online"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Aapka data read ho raha hai
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns] # Spaces hatane ke liye
        
        # Data aggregation
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for _, row in grouped.iterrows():
            enrol = int(row['Enrolment'])
            # R-Y-G Status Logic
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Stable" if code == "G" else ("Moderate" if code == "Y" else "Critical")
            })
        
        return jsonify({"patterns": results})
    except Exception as e:
        # Agar koi error aaye toh frontend ko pata chale
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
