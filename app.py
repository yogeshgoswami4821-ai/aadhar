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
        return jsonify({"error": "⚠️ No file found in request!"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: File reading
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]
        
        # Step 2: Specific Warning Check for Columns
        required_cols = ['State', 'District', 'Tehsil', 'Enrolment']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({"error": f"⚠️ Missing Columns: {', '.join(missing)}. Please check your CSV headers."}), 400

        # Step 3: Calculation Logic
        df['Enrolment'] = pd.to_numeric(df['Enrolment'], errors='coerce').fillna(0)
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for _, row in grouped.iterrows():
            enrol = int(row['Enrolment'])
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })
            
        return jsonify({"patterns": results})

    except Exception as e:
        return jsonify({"error": f"❌ Server Error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
