from flask import Flask, request, jsonify
import os
from parser import parse_winols_csv, extract_table_from_bin

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Upload endpoint för CSV & BIN
@app.route('/api/upload', methods=['POST'])
def upload_files():
    csv_file = request.files.get('csv')
    bin_file = request.files.get('bin')
    if not csv_file or not bin_file:
        return jsonify({'error': 'CSV och BIN måste laddas upp!'}), 400
    csv_path = os.path.join(UPLOAD_FOLDER, csv_file.filename)
    bin_path = os.path.join(UPLOAD_FOLDER, bin_file.filename)
    csv_file.save(csv_path)
    bin_file.save(bin_path)
    params = parse_winols_csv(csv_path)
    # Skicka bara namn & offset först
    paramlist = [{'name': p['name'], 'offset': p['offset'], 'columns': p['columns'], 'rows': p['rows'], 'type': p['type']} for p in params]
    return jsonify({'parameters': paramlist})

# (Kommande endpoints för extrahera/skriva bin kommer här)

if __name__ == "__main__":
    app.run(debug=True)
