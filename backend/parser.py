import pandas as pd

def parse_winols_csv(csv_path):
    df = pd.read_csv(csv_path, sep=';', encoding='latin1')
    params = []
    for _, row in df.iterrows():
        offset = row.get('Fieldvalues.StartAddr.Cpu', '')
        columns = row.get('Columns', 1)
        rows = row.get('Rows', 1)
        if pd.isnull(offset) or str(offset).strip() == '':
            continue
        params.append({
            'name': row.get('Name', ''),
            'id': row.get('IdName', ''),
            'offset': str(offset).replace('$', '').strip(),
            'columns': int(columns) if not pd.isnull(columns) else 1,
            'rows': int(rows) if not pd.isnull(rows) else 1,
            'type': row.get('Type', '')
        })
    return params

def extract_table_from_bin(bin_path, offset, columns, rows):
    offset = int(str(offset).replace('$', '').strip(), 16)
    length = int(columns) * int(rows)
    # Sätt maxgräns för utdrag ur bin, t.ex. max 512 bytes
    if length > 512:
        length = 512
    with open(bin_path, 'rb') as f:
        f.seek(offset)
        data = f.read(length)
        return list(data)
