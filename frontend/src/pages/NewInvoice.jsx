import React, { useEffect, useState } from "react";
import axios from "axios";

const NewInvoice = () => {
  const [medicineList, setMedicineList] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch medicines on mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/medicine/list", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMedicineList(res.data))
      .catch((err) => console.error("Error fetching medicines:", err));
  }, [token]);

  const generateCredentials = (name) => {
    const uname = name.toLowerCase();
    const pwd = name.toLowerCase() + Math.floor(1000 + Math.random() * 9000);
    setUsername(uname);
    setPassword(pwd);
  };

  const handleCustomerChange = (e) => {
    const name = e.target.value;
    setCustomerName(name);
    if (name) generateCredentials(name.split(" ")[0]);
  };

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
    return new Date(dateStr) < today;
  };

  const addMedicineToInvoice = (medicine) => {
    if (invoiceItems.some((item) => item._id === medicine._id)) return;
    if (isExpired(medicine.expiry_date)) return alert("Cannot add expired medicine.");

    setInvoiceItems([
      ...invoiceItems,
      { ...medicine, selectedQty: 1, subtotal: medicine.price },
    ]);
    setAddMedicineOpen(false);
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

  // Create invoice & send SMS
  const handleSubmitInvoice = async () => {
    if (!customerName || !mobileNumber) return alert("Enter name & mobile");
    if (invoiceItems.length === 0) return alert("Add medicines");

    const invoiceData = {
      customerName,
      mobileNumber,
      username,
      password,
      items: invoiceItems.map((item) => ({
        medicineId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.selectedQty,
        subtotal: item.subtotal,
      })),
      totalAmount,
      createdAt: new Date(),
    };

    try {
      // Create invoice
      const invoiceRes = await axios.post(
        "http://localhost:5000/api/invoice/new",
        invoiceData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (invoiceRes.status === 201) {
        // Send SMS
        await axios.post(
          "http://localhost:5000/api/invoice/send-sms",
          { mobile: mobileNumber, username, password },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        alert("Invoice created & credentials sent!");
        // Reset form
        setCustomerName("");
        setMobileNumber("");
        setUsername("");
        setPassword("");
        setInvoiceItems([]);
      }
    } catch (err) {
      console.error("Invoice/SMS Error:", err);
      alert("Failed to create invoice or send SMS.");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", padding: "20px", minHeight: "100vh", background: "#f0f0f0" }}>
      <h1 style={{ marginBottom: "20px", color: "#333" }}>Billing Dashboard</h1>

      {/* Customer & Summary */}
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 2, background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3>Customer Info</h3>
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={handleCustomerChange}
            style={{ width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <input
            type="text"
            placeholder="Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          {username && (
            <div style={{ marginBottom: "10px", fontSize: "14px", color: "#555" }}>
              Username: <b>{username}</b>, Password: <b>{password}</b>
            </div>
          )}
        </div>

        <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3>Invoice Summary</h3>
          <p>Total Amount: <b>₹{totalAmount.toFixed(2)}</b></p>
          <button
            onClick={handleSubmitInvoice}
            style={{ width: "100%", padding: "10px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}
          >
            Submit & Send Credentials
          </button>
        </div>
      </div>

      {/* Invoice Table */}
      <div style={{ marginTop: "20px", background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8f8f8" }}>
            <tr>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Medicine</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Price</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Stock</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Quantity</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Subtotal</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, idx) => (
              <tr key={item._id}>
                <td style={{ padding: "10px" }}>{item.name}</td>
                <td style={{ padding: "10px" }}>₹{item.price}</td>
                <td style={{ padding: "10px", color: item.quantity === 0 ? "red" : "#333" }}>
                  {item.quantity === 0 ? "Out of Stock" : item.quantity}
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={item.selectedQty}
                    disabled={item.quantity === 0}
                    onChange={(e) => updateQuantity(idx, parseInt(e.target.value || "1"))}
                    style={{ width: "60px", padding: "4px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </td>
                <td style={{ padding: "10px" }}>₹{item.subtotal.toFixed(2)}</td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => removeMedicine(item._id)}
                    style={{ backgroundColor: "#f44336", color: "#fff", border: "none", padding: "5px 10px", cursor: "pointer", borderRadius: "4px" }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Medicine */}
        <div style={{ marginTop: "15px", position: "relative" }}>
          <button
            onClick={() => setAddMedicineOpen(!addMedicineOpen)}
            style={{ padding: "8px 16px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            + Add Medicine
          </button>
          {addMedicineOpen && (
            <div style={{ position: "absolute", top: "40px", left: 0, width: "300px", backgroundColor: "#fff", border: "1px solid #ccc", zIndex: 1000, maxHeight: "200px", overflowY: "auto", padding: "8px", borderRadius: "5px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search medicine..."
                style={{ width: "100%", padding: "6px", marginBottom: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
              {(query ? suggestions : medicineList).map((med) => (
                <div key={med._id} onClick={() => addMedicineToInvoice(med)} style={{ padding: "6px", cursor: "pointer", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                  <span>{med.name}</span>
                  <span>₹{med.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewInvoice;
