import pandas as pd

def parse_winols_csv(csv_path):
    df = pd.read_csv(csv_path, sep=';', encoding='latin1')
    params = []
    for _, row in df.iterrows():
        if pd.isnull(row.get('Fieldvalues.StartAddr.Cpu')):
            continue
        params.append({
            'name': row.get('Name', ''),
            'offset': str(row.get('Fieldvalues.StartAddr.Cpu', '')).replace('$', '').strip(),
            'columns': int(row.get('Columns', 1)),
            'rows': int(row.get('Rows', 1)),
            'type': row.get('Type', '')
        })
    return params

def extract_table_from_bin(bin_path, offset, columns, rows):
    offset = int(str(offset).replace('$', '').strip(), 16)
    length = columns * rows
    with open(bin_path, 'rb') as f:
        f.seek(offset)
        data = f.read(length)
        return list(data)
