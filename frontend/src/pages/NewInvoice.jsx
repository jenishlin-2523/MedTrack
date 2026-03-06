import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

// --- Default Schedule Times ---
const DEFAULT_TIMES = {
  Morning: "08:30",
  Afternoon: "13:00",
  Night: "20:30",
};

// ---------- Styles ----------
const inputStyle = { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", marginTop: 4, boxSizing: 'border-box' };
const readonlyInput = { ...inputStyle, background: "#f9f9f9" };
const th = { textAlign: "left", padding: "8px 6px", fontSize: 13, fontWeight: "bold", color: "#333" };
const td = { padding: "10px 6px", fontSize: 13 };
const btnSuccess = { background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 6, cursor: "pointer" };
const btnDanger = { background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" };
const dropdownStyle = { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 6, marginTop: 6, maxHeight: 200, overflowY: "auto", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" };
const dropdownItem = { padding: "8px 10px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f1f1" };
const containerStyle = { fontFamily: "Times New Roman", padding: 20, minHeight: "100vh" };

const NewInvoice = () => {
  const [medicineList, setMedicineList] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [patientName, setPatientName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);
  const [ignoreBlur, setIgnoreBlur] = useState(false);

  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  // --- Invoice Number Helpers ---
  const nextInvoiceNumber = (last) => {
    const year = new Date().getFullYear();
    if (!last || !/^MT\d{4}\d{3}$/.test(last)) return `MT${year}001`;
    const lastYear = parseInt(last.slice(2, 6), 10);
    const lastSeq = parseInt(last.slice(6), 10);
    return lastYear === year ? `MT${year}${(lastSeq + 1).toString().padStart(3, "0")}` : `MT${year}001`;
  };

  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  // --- Fetch Medicines ---
  const fetchMedicines = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/medicine/list`, { headers: { Authorization: `Bearer ${token}` } });
      setMedicineList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Fetch Last Invoice Number ---
  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/invoice/last`, { headers: { Authorization: `Bearer ${token}` } });
      const lastNumber = res?.data?.invoiceNumber;
      const nextNumber = nextInvoiceNumber(lastNumber);
      setInvoiceNumber(nextNumber);
      localStorage.setItem("invoiceNumber", nextNumber);
    } catch (e) {
      const year = new Date().getFullYear();
      const defaultNumber = `MT${year}001`;
      setInvoiceNumber(defaultNumber);
      localStorage.setItem("invoiceNumber", defaultNumber);
    }
  };

  // --- Load invoice number from localStorage ---
  useEffect(() => {
    const savedNumber = localStorage.getItem("invoiceNumber");
    if (savedNumber) setInvoiceNumber(savedNumber);
    else fetchNextInvoiceNumber();
  }, []);

  useEffect(() => { fetchMedicines(); }, [token]);

  // --- Search & Add Medicine ---
  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSuggestions(value ? medicineList.filter(m => m.name?.toLowerCase().includes(value.toLowerCase())).slice(0, 8) : []);
    setAddMedicineOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => { if (!ignoreBlur) setAddMedicineOpen(false); setIgnoreBlur(false); }, 100);
  };
  const handleItemMouseDown = () => setIgnoreBlur(true);

  const addMedicineToInvoice = (med) => {
    if (!med?._id || isExpired(med.expiry_date) || med.quantity === 0) return;
    if (invoiceItems.some(x => x._id === med._id)) return;
    setInvoiceItems(prev => [...prev, { ...med, selectedQty: 1, subtotal: med.price, schedule: [], times: DEFAULT_TIMES }]);
    setAddMedicineOpen(false); setQuery(""); setSuggestions([]); setIgnoreBlur(false);
  };

  const updateQuantity = (index, qty) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      const max = updated[index].quantity ?? 0;
      const clamped = Math.max(1, Math.min(Number(qty) || 1, max));
      updated[index] = { ...updated[index], selectedQty: clamped, subtotal: clamped * (updated[index].price || 0) };
      return updated;
    });
  };

  const removeItem = (id) => setInvoiceItems(prev => prev.filter(x => x._id !== id));
  const toggleSchedule = (index, time) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      let schedule = updated[index].schedule || [];
      schedule = schedule.includes(time) ? schedule.filter(t => t !== time) : [...schedule, time];
      updated[index] = { ...updated[index], schedule };
      return updated;
    });
  };
  const updateScheduleTime = (index, timeKey, value) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      updated[index].times = { ...updated[index].times, [timeKey]: value };
      return updated;
    });
  };

  const totalAmount = useMemo(() => invoiceItems.reduce((sum, i) => sum + (i.subtotal || 0), 0), [invoiceItems]);

  // --- PDF Rendering ---
  const renderPdf = (generatedUsername, generatedPassword) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    const blue = '#285194';
    const totalRowBg = '#f0f0f0';
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableEnd = pageWidth - margin;
    const formatCurrency = (amount) => (Number(amount) || 0).toFixed(2);

    const totalAmount = invoiceItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    doc.setFillColor(blue);
    doc.rect(0, y - 20, pageWidth, 2, 'F');
    y += 20;

    doc.setFontSize(30);
    doc.setFont(undefined, "bold");
    doc.setTextColor(blue);
    doc.text("INVOICE", margin, y);
    doc.setTextColor(0);
    y += 50;

    // LEFT
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("MEDI TRACK PHARMACY", margin, y);
    doc.setFont(undefined, "normal");
    y += 14;
    doc.text("Chunkankadai, Nagercoil, TamilNadu", margin, y);
    y += 12;
    doc.text("Contact: +91 9876543210", margin, y);
    y += 12;
    doc.text("meditrackpharmacy@gmail.com", margin, y);

    // RIGHT
    let rightColX = 300;
    let valueColX = 400;
    let tempY = y - 40;

    doc.setFont(undefined, "bold");
    doc.text("BILLED TO:", rightColX, tempY);
    doc.setFont(undefined, "normal");
    tempY += 14;
    doc.text(`Patient Name:`, rightColX, tempY); doc.text(patientName || '-', valueColX, tempY);
    tempY += 12;
    doc.text(`Contact:`, rightColX, tempY); doc.text(contactNumber || '-', valueColX, tempY);
    tempY += 18;
    doc.text("Invoice No:", rightColX, tempY); doc.text(invoiceNumber || '-', valueColX, tempY);
    tempY += 12;
    doc.text("Issue Date:", rightColX, tempY); doc.text(invoiceDate || '-', valueColX, tempY);

    y = Math.max(y, tempY) + 40;

    const colX = { desc: margin, qty: 360, price: 450, total: 540 };

    doc.setFillColor(blue);
    doc.rect(margin, y, tableEnd - margin, 18, 'F');

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255);
    doc.text("ITEMS DESCRIPTION", colX.desc, y + 12);
    doc.text("QTY", colX.qty, y + 12, { align: 'center' });
    doc.text("UNIT PRICE", colX.price, y + 12, { align: 'right' });
    doc.text("TOTAL", colX.total, y + 12, { align: 'right' });
    doc.setTextColor(0);
    y += 28;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    invoiceItems.forEach((i) => {
      doc.setFont(undefined, "bold");
      doc.text(i.name || "-", colX.desc, y);
      doc.setFont(undefined, "normal");
      doc.text(String(i.selectedQty || 0), colX.qty, y, { align: 'center' });
      doc.text(formatCurrency(i.price || 0), colX.price, y, { align: 'right' });
      doc.text(formatCurrency(i.subtotal || 0), colX.total, y, { align: 'right' });
      doc.setDrawColor('#cccccc');
      doc.line(margin, y + 5, tableEnd, y + 5);
      y += 20;
    });

    y += 10;

    const totalBoxLabelX = 400;
    const totalBoxValueX = colX.total;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Sub Total", totalBoxLabelX, y);
    doc.text(formatCurrency(totalAmount), totalBoxValueX, y, { align: 'right' });
    y += 15;

    y += 5;
    doc.setFillColor(totalRowBg);
    doc.rect(totalBoxLabelX - 10, y - 10, totalBoxValueX - totalBoxLabelX + 20, 20, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(blue);
    doc.text("TOTAL", totalBoxLabelX, y + 3);
    doc.text(formatCurrency(totalAmount), totalBoxValueX, y + 3, { align: 'right' });
    doc.setTextColor(0);
    y += 30;

    const startY = y;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("THANK YOU FOR YOUR BUSINESS", margin, y);
    y += 15;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text("Invoice Terms:", margin, y);
    y += 12;
    doc.text("Medicines once sold will not be returned or exchanged.", margin, y);

    if (generatedUsername && generatedPassword) {
      doc.setFont(undefined, "bold");
      doc.setTextColor(blue);
      doc.text("Your New Account Credentials:", 300, startY);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0);
      doc.text(`Username: ${generatedUsername}`, 300, startY + 12);
      doc.text(`Password: ${generatedPassword}`, 300, startY + 24);
    }

    doc.output("dataurlnewwindow");
  };

  // --- Submit Invoice ---
  const handleSubmit = async () => {
    if (!patientName || !contactNumber) return alert("Please fill Patient Name and Contact Number.");
    if (invoiceItems.length === 0) return alert("Please add at least one medicine.");

    try {
      const payload = {
        invoiceNumber,
        invoiceDate,
        patientName,
        contactNumber,
        items: invoiceItems.map((i) => ({
          medicineId: i._id,
          name: i.name,
          price: i.price,
          selectedQty: i.selectedQty,
          subtotal: i.subtotal,
          schedule: i.schedule?.length ? i.schedule.map(timeKey => ({ time: timeKey, value: i.times?.[timeKey] })) : [],
        })),
      };

      const res = await axios.post(`${BASE_URL}/api/invoice/new`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      renderPdf(res.data.username, res.data.password);

      if (res.data.password) {
        alert("New user created! Account credentials have been printed on the invoice.");
      } else {
        alert(`Invoice added for existing user ${contactNumber}`);
      }

      setPatientName("");
      setContactNumber("");
      setInvoiceItems([]);

      const nextNumber = nextInvoiceNumber(invoiceNumber);
      setInvoiceNumber(nextNumber);
      localStorage.setItem("invoiceNumber", nextNumber);
    } catch (e) {
      console.error("AxiosError:", e);
      alert("Failed to submit invoice.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#2563eb" }}>MediTrack Pharmacy</h2>
        <div style={{ fontSize: 13, color: "#555" }}>
          Chunkankadai, Nagercoil, TamilNadu<br />
          Contact: +91 9876543210 | meditrackpharmacy@gmail.com
        </div>
      </div>

      <h1 style={{ marginBottom: 16, color: "#333" }}>Billing Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: '16px 20px', background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <div>
          <label>Patient Name</label>
          <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="John Doe" style={inputStyle} />
        </div>
        <div>
          <label>Contact Number</label>
          <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="9xxxxxxxxx" style={inputStyle} />
        </div>
        <div>
          <label>Invoice No.</label>
          <input type="text" value={invoiceNumber} readOnly style={readonlyInput} />
        </div>
        <div>
          <label>Invoice Date</label>
          <input type="date" value={invoiceDate} readOnly style={readonlyInput} />
        </div>
      </div>

      {/* Invoice Items Table */}
      <div style={{ background: "#fff", padding: 16, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Medicine</th>
              <th style={th}>Price</th>
              <th style={th}>Stock</th>
              <th style={th}>Qty</th>
              <th style={th}>Schedule</th>
              <th style={th}>Subtotal</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, padding: 18 }}>No items yet. Add medicines by searching.</td></tr>
            )}
            {invoiceItems.map((item, idx) => (
              <tr key={item._id} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>{item.name}</td>
                <td style={td}>{currency(item.price)}</td>
                <td style={{ ...td, color: item.quantity === 0 || isExpired(item.expiry_date) ? "red" : "#333" }}>
                  {item.quantity === 0 ? "Out of Stock" : isExpired(item.expiry_date) ? "Expired" : item.quantity}
                </td>
                <td style={td}>
                  <input type="number" min="1" max={item.quantity} value={item.selectedQty} onChange={e => updateQuantity(idx, e.target.value)} style={{ width: 70, textAlign: 'center', borderRadius: 6, border: '1px solid #ddd', padding: 6 }} />
                </td>
                <td style={{ ...td, minWidth: 150 }}>
                  {Object.keys(DEFAULT_TIMES).map(timeKey => (
                    <div key={timeKey} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                      <label style={{ marginRight: 8, minWidth: 20 }}>
                        <input type="checkbox" checked={item.schedule?.includes(timeKey)} onChange={() => toggleSchedule(idx, timeKey)} style={{ marginRight: 4 }} />
                        {timeKey.charAt(0)}
                      </label>
                      <input type="time" value={item.times?.[timeKey] || DEFAULT_TIMES[timeKey]} onChange={e => updateScheduleTime(idx, timeKey, e.target.value)} readOnly={!item.schedule?.includes(timeKey)} style={{ width: 65, padding: 2, border: '1px solid #ccc', borderRadius: 4, background: item.schedule?.includes(timeKey) ? '#fff' : '#f0f0f0' }} />
                    </div>
                  ))}
                </td>
                <td style={td}>{currency(item.subtotal)}</td>
                <td style={td}><button onClick={() => removeItem(item._id)} style={btnDanger}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Medicine Search */}
        <div style={{ marginTop: 14, position: "relative" }}>
          <input type="text" value={query} onChange={handleSearch} placeholder="Search medicine..." style={inputStyle} onFocus={() => setAddMedicineOpen(true)} onBlur={handleInputBlur} />
          {addMedicineOpen && query && (
            <div style={dropdownStyle}>
              {suggestions.length > 0 ? suggestions.map(m => {
                const expiredOrOut = isExpired(m.expiry_date) || m.quantity === 0;
                return (
                  <div key={m._id} onClick={() => !expiredOrOut && addMedicineToInvoice(m)} onMouseDown={handleItemMouseDown} style={{ ...dropdownItem, color: expiredOrOut ? "red" : "#000", cursor: expiredOrOut ? "not-allowed" : "pointer" }}>
                    <span>{m.name} {isExpired(m.expiry_date) ? "(Expired)" : m.quantity === 0 ? "(Out of Stock)" : ""}</span>
                    <span>{currency(m.price)}</span>
                  </div>
                );
              }) : <div style={{ padding: 8, color: "#777" }}>No matches</div>}
            </div>
          )}
        </div>

        {/* Total & Submit */}
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 16 }}>
            Total Amount: <b>{currency(totalAmount)}</b>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Medicines once sold cannot be returned.</div>
          </div>
          <button onClick={handleSubmit} style={btnSuccess}>Generate Invoice PDF</button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoice;
