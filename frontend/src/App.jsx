import React, { useState } from 'react';
import axios from 'axios';

// Lägg till fler nyckelord efter behov!
const RELEVANT_KEYWORDS = [
  "LC", "LAUNCH",        // Launch Control
  "SHIFT", "GEAR",       // Växling
  "RPM", "REV",          // Varvtal/Rev limiter
  "DTC", "EGR", "DPF",   // Emission/DTC
  "BOOST", "TORQUE"      // Exempel
];

// Auto-filterfunktion för intressanta mappar
function isRelevantTable(p) {
  const name = (p.name || "").toUpperCase();
  const id = (p.id || "").toUpperCase();
  return RELEVANT_KEYWORDS.some(keyword => name.includes(keyword) || id.includes(keyword));
}

function App() {
  const [csv, setCsv] = useState(null);
  const [bin, setBin] = useState(null);
  const [params, setParams] = useState([]);
  const [selectedParam, setSelectedParam] = useState(null);
  const [tableValues, setTableValues] = useState([]);
  const [editValues, setEditValues] = useState([]);
  const [status, setStatus] = useState('');

  // Uppladdning och filtrering av parametrar
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
      // Filtrera automatiskt efter relevanta mappar
      const filtered = res.data.parameters.filter(isRelevantTable);
      setParams(filtered);
      setStatus(`Hittade ${filtered.length} relevanta mappar!`);
    } catch (e) {
      setStatus('Fel vid uppladdning!');
    }
  };

  // Hämta data för vald mapp
  const fetchTable = async (param) => {
    setStatus('Hämtar data...');
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
    setEditValues(res.data.values); // För redigering
    setStatus('');
  };

  // Hantera redigering
  const handleEdit = (i, val) => {
    const arr = [...editValues];
    arr[i] = val;
    setEditValues(arr);
  };

  // Spara och ladda ner ny bin
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
          <div style={{display: 'flex', flexWrap: 'wrap'}}>
            {editValues.map((val, i) => (
              <input
                key={i}
                value={val}
                onChange={e => handleEdit(i, e.target.value)}
                style={{ width: 60, margin: 2 }}
              />
            ))}
          </div>
          <br />
          <button onClick={saveEdit}>Spara & ladda ner ny bin</button>
        </div>
      )}
    </div>
  );
}

export default App;
