import pandas as pd

def _to_float(val, default=0.0):
    if val is None or (isinstance(val, float) and pd.isnull(val)):
        return default
    s = str(val).strip()
    if s == "" or s.lower() == "nan":
        return default
    # ta bort tusentalsavgränsare och konvertera decimal-komma -> punkt
    s = s.replace(" ", "").replace("\u00A0", "")  # vanliga whitespaces inkl. non‑breaking space
    # Om det finns både punkt och komma, anta punkt = tusentals, komma = decimal
    if "," in s and "." in s:
        # Ta bort punkter (tusentals) och använd komma som decimal
        s = s.replace(".", "").replace(",", ".")
    else:
        # Byt komma till punkt
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return default

def _to_int(val, default=1):
    f = _to_float(val, float(default))
    try:
        return int(round(f))
    except Exception:
        return default

def parse_winols_csv(csv_path):
    # Läs som text, vi konverterar själva (pga blandade format)
    df = pd.read_csv(csv_path, sep=';', encoding='latin1', dtype=str)
    params = []
    for _, row in df.iterrows():
        start_addr = row.get('Fieldvalues.StartAddr.Cpu', '') or row.get('Start offset', '')
        if start_addr is None or str(start_addr).strip() == '':
            continue

        columns = _to_int(row.get('Columns', 1), 1)
        rows    = _to_int(row.get('Rows', 1), 1)

        factor     = _to_float(row.get('Factor', 1), 1.0)
        add_offset = _to_float(row.get('Offset', row.get('Fieldvalues.Offset', 0)), 0.0)
        unit       = (row.get('Unit', '') or row.get('Fieldvalues.Unit', '') or '').strip()

        params.append({
            'name'      : row.get('Name', '') or '',
            'id'        : row.get('IdName', '') or '',
            'offset'    : str(start_addr).replace('$', '').strip(),
            'columns'   : columns,
            'rows'      : rows,
            'type'      : row.get('Type', '') or '',
            'factor'    : factor,
            'add_offset': add_offset,
            'unit'      : unit
        })
    return params

def extract_table_from_bin(bin_path, offset, columns, rows):
    offset_int = int(str(offset).replace('$', '').strip(), 16)
    length = int(columns) * int(rows)
    # Skydd mot orimliga tabeller
    if length > 512:
        length = 512
    with open(bin_path, 'rb') as f:
        f.seek(offset_int)
        data = f.read(length)
        return list(data)
