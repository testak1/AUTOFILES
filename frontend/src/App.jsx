import React, { useState } from 'react';
import axios from 'axios';

const RELEVANT_KEYWORDS = [
  "LC", "LAUNCH", "SHIFT", "GEAR", "RPM", "REV",
  "DTC", "EGR", "DPF", "BOOST", "TORQUE", "NM", "MS"
];
const MAX_SHOW = 32;

// Funktion för att avgöra vilken enhet/redigering som ska användas:
function getDisplayType(param) {
  const name = (param.name || "").toUpperCase();
  const id = (param.id || "").toUpperCase();
  if (name.includes("RPM") || id.includes("RPM") || name.includes("LAUNCH")) return { unit: "rpm", label: "Varvtal (RPM)" };
  if (name.includes("TORQUE") || id.includes("TORQUE") || name.includes("NM")) return { unit: "nm", label: "Moment (Nm)" };
  if (name.includes("SHIFT") || name.includes("GEAR") || name.includes("TIME") || id.includes("MS")) return { unit: "ms", label: "Växlingstid (ms)" };
  return { unit: param.unit || "", label: param.unit || "" };
}

function isRelevantTable(p) {
  const name = (p.name || "").toUpperCase();
  const id = (p.id || "").toUpperCase();
  return RELEVANT_KEYWORDS.some(keyword => name.includes(keyword) || id.includes(keyword));
}

function toPhys(val, factor, offset) {
  return (Number(val) * factor + offset);
}
function fromPhys(phys, factor, offset) {
  return Math.round((Number(phys) - offset) / factor);
}

function App() {
  const [csv, setCsv] = useState(null);
  const [bin, setBin] = useState(null);
  const [params, setParams] = useState([]);
  const [selectedParam, setSelectedParam] = useState(null);
  const [tableValues, setTableValues] = useState([]);
  const [editValues, setEditValues] = useState([]);
  const [status, setStatus] = useState('');
  const [showAll, setShowAll] = useState(false);

  const handleUpload = async () => {
    if (!csv || !bin) {
      alert('Ladda upp både CSV och BIN!');
      return;
    }
    setStatus('Laddar...');
    const formData = new FormData();
    formData.append('csv', csv);
    formData.append('bin', bin);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const filtered = res.data.parameters.filter(isRelevantTable);
      setParams(filtered);
      setStatus(`Hittade ${filtered.length} relevanta mappar!`);
    } catch (e) {
      setStatus('Fel vid uppladdning!');
    }
  };

  const fetchTable = async (param) => {
    setStatus('Hämtar data...');
    setShowAll(false);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/get_table`,
        {
          bin_filename: bin.name,
          offset: param.offset,
          columns: param.columns,
          rows: param.rows,
        }
      );
      setSelectedParam(param);
      setTableValues(res.data.values);
      setEditValues(res.data.values);
      setStatus('');
    } catch {
      setStatus('Fel vid laddning av mapp!');
    }
  };

  const handleEdit = (i, val, displayType, factor, add_offset) => {
    const arr = [...editValues];
    arr[i] = (displayType.unit === "rpm" || displayType.unit === "nm" || displayType.unit === "ms")
      ? fromPhys(val, factor, add_offset)
      : val;
    setEditValues(arr);
  };

  const saveEdit = async () => {
    setStatus('Sparar & genererar bin...');
    await axios.post(
      `${import.meta.env.VITE_API_URL}/api/set_table`,
      {
        bin_filename: bin.name,
        offset: selectedParam.offset,
        columns: selectedParam.columns,
        rows: selectedParam.rows,
        values: editValues,
      },
      { responseType: 'blob' }
    ).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ny-fil.bin');
      document.body.appendChild(link);
      link.click();
      setStatus('Klar! Binär nedladdad.');
    }).catch(() => setStatus('Fel vid sparande!'));
  };

  const visibleValues = showAll ? editValues : editValues.slice(0, MAX_SHOW);

  // Hämta label/enhet
  const displayType = selectedParam ? getDisplayType(selectedParam) : { unit: "", label: "" };
  const factor = selectedParam?.factor ?? 1;
  const add_offset = selectedParam?.add_offset ?? 0;

  return (
    <div>
      <h1>TCU/ECU Editor</h1>
      <div>
        <input type="file" accept=".csv" onChange={e => setCsv(e.target.files[0])} />
        <input type="file" accept=".bin" onChange={e => setBin(e.target.files[0])} />
        <button onClick={handleUpload}>Ladda upp & lista relevanta mappar</button>
      </div>
      {status && <div><b>{status}</b></div>}
      <ul>
        {params.map((p, i) => (
          <li key={i}>
            <b>{p.name}</b> (offset: {p.offset}, size: {p.columns}x{p.rows}) [{p.type}]
            <button onClick={() => fetchTable(p)} style={{marginLeft: 10}}>Visa/Redigera</button>
          </li>
        ))}
      </ul>
      {selectedParam && (
        <div>
          <h3>{selectedParam.name} (offset: {selectedParam.offset})</h3>
          <div style={{fontSize: 'smaller', color: '#555', marginBottom: 6}}>
            Redigerar i <b>{displayType.label || displayType.unit || selectedParam.unit || "råvärde"}</b>
            {["rpm", "nm", "ms"].includes(displayType.unit) && (
              <> (factor: {factor}, offset: {add_offset})</>
            )}
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap'}}>
            {visibleValues.map((val, i) => (
              <input
                key={i}
                value={
                  (displayType.unit === "rpm" || displayType.unit === "nm" || displayType.unit === "ms")
                    ? toPhys(val, factor, add_offset)
                    : val
                }
                onChange={e =>
                  handleEdit(i, e.target.value, displayType, factor, add_offset)
                }
                style={{ width: 80, margin: 2 }}
                type="number"
              />
            ))}
            {!showAll && editValues.length > MAX_SHOW && (
              <div>
                ...{editValues.length - MAX_SHOW} till.{" "}
                <button onClick={() => setShowAll(true)}>Visa alla</button>
              </div>
            )}
          </div>
          <br />
          <button onClick={saveEdit}>Spara & ladda ner ny bin</button>
        </div>
      )}
    </div>
  );
}

export default App;
