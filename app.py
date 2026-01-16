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
    # Check if file exists in request
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    
    try:
        # Step 1: Read CSV and clean headers
        df = pd.read_csv(file)
        df.columns = [c.strip() for c in df.columns]
        
        # Step 2: Ensure Enrolment is numeric to avoid calculation errors
        df['Enrolment'] = pd.to_numeric(df['Enrolment'], errors='coerce').fillna(0)
        
        # Step 3: Group by Hierarchy (State > District > Tehsil)
        grouped = df.groupby(['State', 'District', 'Tehsil'])['Enrolment'].sum().reset_index()
        
        # Step 4: Calculate Average for Status Coding
        avg_val = grouped['Enrolment'].mean()
        
        results = []
        for _, row in grouped.iterrows():
            enrol = int(row['Enrolment'])
            
            # Step 5: R-Y-G Status Logic
            # Red: Below 50% of Average | Yellow: Below Average | Green: Above Average
            code = "G"
            if enrol < (avg_val * 0.5):
                code = "R"
            elif enrol < avg_val:
                code = "Y"
                
            results.append({
                "place": f"{row['State']} > {row['District']} > {row['Tehsil']}",
                "enrolment": enrol,
                "code": code,
                "analysis": "Critical" if code == "R" else ("Moderate" if code == "Y" else "Stable")
            })
            
        return jsonify({"patterns": results})

    except Exception as e:
        # Error handling to prevent 'Server Error' message without context
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Get port from environment for Render deployment
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
