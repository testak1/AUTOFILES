import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [csv, setCsv] = useState(null);
  const [bin, setBin] = useState(null);
  const [params, setParams] = useState([]);
  const [selectedParam, setSelectedParam] = useState(null);
  const [tableValues, setTableValues] = useState([]);

  const handleUpload = async () => {
    if (!csv || !bin) {
      alert('Ladda upp både CSV och BIN!');
      return;
    }
    const formData = new FormData();
    formData.append('csv', csv);
    formData.append('bin', bin);
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    setParams(res.data.parameters);
  };

  const fetchTable = async (param) => {
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
  };

  return (
    <div>
      <h1>TCU/ECU Editor</h1>
      <input type="file" accept=".csv" onChange={e => setCsv(e.target.files[0])} />
      <input type="file" accept=".bin" onChange={e => setBin(e.target.files[0])} />
      <button onClick={handleUpload}>Ladda upp & lista mappar</button>
      <ul>
        {params.map((p, i) => (
          <li key={i}>
            {p.name} (offset: {p.offset}, size: {p.columns}x{p.rows}) [{p.type}]
            <button onClick={() => fetchTable(p)}>Visa data</button>
          </li>
        ))}
      </ul>
      {selectedParam && (
        <div>
          <h3>{selectedParam.name}</h3>
          <pre>{JSON.stringify(tableValues, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
