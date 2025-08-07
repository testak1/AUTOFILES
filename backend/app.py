from flask import Flask, request, jsonify, send_file
import os
from flask_cors import CORS
from parser import parse_winols_csv, extract_table_from_bin

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
    paramlist = [
        {
            'name': p['name'],
            'id': p.get('id', ''),
            'offset': p['offset'],
            'columns': p['columns'],
            'rows': p['rows'],
            'type': p['type']
        } for p in params
    ]
    return jsonify({'parameters': paramlist})

@app.route('/api/get_table', methods=['POST'])
def get_table():
    data = request.json
    bin_path = os.path.join(app.config['UPLOAD_FOLDER'], data['bin_filename'])
    offset = data['offset']
    columns = data['columns']
    rows = data['rows']
    values = extract_table_from_bin(bin_path, offset, columns, rows)
    return jsonify({'values': values})

@app.route('/api/set_table', methods=['POST'])
def set_table():
    data = request.json
    bin_path = os.path.join(app.config['UPLOAD_FOLDER'], data['bin_filename'])
    offset = int(str(data['offset']).replace('$', '').strip(), 16)
    values = [int(v) for v in data['values']]
    # Läs in befintlig bin, skriv över vald tabell
    with open(bin_path, 'rb') as f:
        b = bytearray(f.read())
    b[offset:offset+len(values)] = bytes(values)
    # Spara som ny fil och skicka tillbaka
    out_path = bin_path.replace('.bin', '_modded.bin')
    with open(out_path, 'wb') as f:
        f.write(b)
    return send_file(out_path, as_attachment=True, download_name="ny-fil.bin")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
