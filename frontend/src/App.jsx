import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [csv, setCsv] = useState(null);
  const [bin, setBin] = useState(null);
  const [params, setParams] = useState([]);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('csv', csv);
    formData.append('bin', bin);
    const res = await axios.post('http://localhost:5000/api/upload', formData);
    setParams(res.data.parameters);
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={e => setCsv(e.target.files[0])} />
      <input type="file" accept=".bin" onChange={e => setBin(e.target.files[0])} />
      <button onClick={handleUpload}>Ladda upp & lista mappar</button>
      <ul>
        {params.map((p, i) => (
          <li key={i}>{p.name} (offset: {p.offset}, size: {p.columns}x{p.rows}) [{p.type}]</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
