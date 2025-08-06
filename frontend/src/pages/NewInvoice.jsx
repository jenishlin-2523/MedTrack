import React, { useEffect, useState } from "react";
import axios from "axios";

const NewInvoice = () => {
  const [medicineList, setMedicineList] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("http://localhost:5000/api/medicine/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setMedicineList(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    const filtered = medicineList.filter((med) =>
      med.name.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(value ? filtered.slice(0, 5) : []);
  };

  const isExpired = (dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    return expiry < today;
  };

  const addMedicineToInvoice = (medicine) => {
    if (invoiceItems.some((item) => item._id === medicine._id)) return;

    if (isExpired(medicine.expiry_date)) {
      alert("Cannot add expired medicine to the invoice.");
      return;
    }

    const newItem = {
      ...medicine,
      selectedQty: 1,
      subtotal: medicine.price,
    };
    setInvoiceItems([...invoiceItems, newItem]);
    setQuery("");
    setSuggestions([]);
  };

  const updateQuantity = (index, qty) => {
    const updated = [...invoiceItems];
    if (qty > updated[index].quantity) return;
    updated[index].selectedQty = qty;
    updated[index].subtotal = qty * updated[index].price;
    setInvoiceItems(updated);
  };

  const removeMedicine = (id) => {
    setInvoiceItems(invoiceItems.filter((item) => item._id !== id));
  };

  const totalAmount = invoiceItems.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2 style={{ marginBottom: "10px" }}>New Invoice</h2>

      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Type medicine name..."
        style={{
          width: "300px",
          padding: "8px",
          marginBottom: "5px",
          border: "1px solid #ccc",
        }}
      />

      <div style={{ position: "relative" }}>
        {suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              width: "300px",
              zIndex: 1000,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((med) => (
              <div
                key={med._id}
                onClick={() => addMedicineToInvoice(med)}
                style={{
                  padding: "8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{med.name}</strong> — ₹{med.price} (
                {med.quantity === 0 ? "❌ Out of Stock" : `Stock: ${med.quantity}`}
                )
              </div>
            ))}
          </div>
        )}
      </div>

      <table
        style={{
          width: "100%",
          marginTop: "20px",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc" }}>Medicine</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Price</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Stock</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Quantity</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Subtotal</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, idx) => (
            <tr key={item._id}>
              <td>{item.name}</td>
              <td>₹{item.price}</td>
              <td style={{ color: item.quantity === 0 ? "red" : "black" }}>
                {item.quantity === 0 ? "Out of Stock" : item.quantity}
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  max={item.quantity}
                  value={item.selectedQty}
                  disabled={item.quantity === 0}
                  onChange={(e) =>
                    updateQuantity(idx, parseInt(e.target.value || "1"))
                  }
                  style={{
                    width: "60px",
                    padding: "4px",
                    border:
                      item.selectedQty > item.quantity
                        ? "1px solid red"
                        : "1px solid #ccc",
                  }}
                />
              </td>
              <td>₹{item.subtotal.toFixed(2)}</td>
              <td>
                <button
                  onClick={() => removeMedicine(item._id)}
                  style={{
                    backgroundColor: "#f44336",
                    color: "#fff",
                    border: "none",
                    padding: "5px 10px",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: "20px" }}>Total: ₹{totalAmount.toFixed(2)}</h3>
    </div>
  );
};

export default NewInvoice;
    