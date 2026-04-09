import React, { useEffect, useState } from "react";
import axios from "axios";

const Home = () => {
  const [medicines, setMedicines] = useState([]);
  const [error, setError] = useState("");

  const fetchMedicines = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://meditrack-backend-ynr1.onrender.com/api/medicine/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMedicines(res.data);
    } catch (err) {
      setError("Unauthorized or expired token");
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Your Medicines</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {medicines.map((med) => (
          <li key={med._id}>
            <strong>{med.name}</strong> - {med.dosage} - {med.expiry_date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
