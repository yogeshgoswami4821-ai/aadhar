from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def health():
    return "Backend Live"

@app.route("/upload", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    try:
        # Step 1: Read all columns but only first 50k rows for speed
        df = pd.read_csv(file, nrows=50000)
        
        # Step 2: Clean column names (Strip spaces and Title Case)
        df.columns = [c.strip().title() for c in df.columns]
        
        # Handle "Enrollment" vs "Enrolment" spelling
        if 'Enrollment' in df.columns:
            df.rename(columns={'Enrollment': 'Enrolment'}, inplace=True)

        # Step 3: Check for mandatory columns
        required = ['State', 'District', 'Tehsil', 'Enrolment']
        missing = [c for c in required if c not in df.columns]
        
        if missing:
            return jsonify({"error": f"⚠️ File Headers Missing: {', '.join(missing)}"}), 400

        # Step 4: Data Processing
        df['Enrolment'] = pd.to_numeric(df['Enrolment'], errors='coerce').fillna(0)
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for _, row in grouped.iterrows():
            enrol = int(row['Enrolment'])
            # R-Y-G Logic
            code = "G"
            if enrol < (avg_val * 0.5): code = "R"
            elif enrol < avg_val: code = "Y"
            
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else "Stable"
            })
            
        return jsonify({"patterns": results})
    except Exception as e:
        return jsonify({"error": f"Processing Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
