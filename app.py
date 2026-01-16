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
        # Step 1: Read headers first to check columns
        df_headers = pd.read_csv(file, nrows=0)
        actual_cols = [c.strip().lower() for c in df_headers.columns]
        
        # Mapping actual columns to required columns
        required = ['state', 'district', 'tehsil', 'enrolment']
        missing = [c for c in required if c not in actual_cols]
        
        if missing:
            return jsonify({"error": f"⚠️ Missing Columns: {', '.join(missing)}"}), 400

        # Step 2: Reload file with mapped columns
        file.seek(0)
        df = pd.read_csv(file)
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Step 3: Fast processing
        df['enrolment'] = pd.to_numeric(df['enrolment'], errors='coerce').fillna(0)
        grouped = df.groupby(['state', 'district', 'tehsil'])['enrolment'].sum().reset_index()
        avg_val = grouped['enrolment'].mean()
        
        results = []
        for _, row in grouped.iterrows():
            enrol = int(row['enrolment'])
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{row['state'].title()} > {row['district'].title()} > {row['tehsil'].title()}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Warning" if code == "Y" else "Stable")
            })
            
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": f"Processing Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
