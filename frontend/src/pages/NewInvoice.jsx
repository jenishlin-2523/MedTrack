// src/components/NewInvoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const NewInvoice = () => {
  const [medicineList, setMedicineList] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [patientName, setPatientName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);

  // Post-submit controls
  const [showCrudBar, setShowCrudBar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch medicines on mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/medicine/list", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMedicineList(res.data || []))
      .catch((err) => console.error("Error fetching medicines:", err));
  }, [token]);

  // Generate/Fetch next invoice number
  useEffect(() => {
    const fetchLast = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/invoice/last", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const last = res?.data?.invoiceNumber; // e.g., "MT2025001"
        const next = nextInvoiceNumber(last);
        setInvoiceNumber(next);
      } catch (e) {
        // Fallback to first of current year
        setInvoiceNumber(firstInvoiceForYear());
      }
    };
    fetchLast();
  }, [token]);

  // ---------- Helpers ----------
  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

  const nextInvoiceNumber = (last) => {
    const year = new Date().getFullYear();
    if (!last || typeof last !== "string" || !/^MT\d{7}$/.test(last)) {
      return `MT${year}001`;
    }
    const lastYear = parseInt(last.slice(2, 6), 10);
    const lastSeq = parseInt(last.slice(6), 10);
    if (lastYear === year) {
      const seq = (lastSeq + 1).toString().padStart(3, "0");
      return `MT${year}${seq}`;
    }
    // New year reset to 001
    return `MT${year}001`;
  };

  const firstInvoiceForYear = () => {
    const year = new Date().getFullYear();
    return `MT${year}001`;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  // ---------- Search / Add ----------
  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    const filtered = medicineList.filter((m) =>
      (m.name || "").toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(value ? filtered.slice(0, 8) : []);
  };

  const addMedicineToInvoice = (med) => {
    if (!med?._id) return;
    if (isExpired(med.expiry_date))
      return alert("Cannot add expired medicine.");
    if (invoiceItems.some((x) => x._id === med._id)) return;

    setInvoiceItems((prev) => [
      ...prev,
      {
        ...med,
        selectedQty: 1,
        subtotal: med.price,
      },
    ]);
    setAddMedicineOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  const updateQuantity = (index, qty) => {
    const updated = [...invoiceItems];
    const max = updated[index].quantity ?? 0;
    const clamped = Math.max(1, Math.min(Number(qty) || 1, max));
    updated[index].selectedQty = clamped;
    updated[index].subtotal = clamped * (updated[index].price || 0);
    setInvoiceItems(updated);
  };

  const removeItem = (id) =>
    setInvoiceItems((prev) => prev.filter((x) => x._id !== id));

  const totalAmount = useMemo(
    () => invoiceItems.reduce((sum, i) => sum + (i.subtotal || 0), 0),
    [invoiceItems]
  );

  // ---------- PDF ----------
  const renderPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.text("Invoice", margin, y);
    doc.setFontSize(11);
    y += 24;

    // Meta & patient
    doc.text(`Invoice No: ${invoiceNumber}`, margin, y);
    doc.text(`Date: ${invoiceDate}`, 300, y);
    y += 18;
    doc.text(`Patient: ${patientName || "-"}`, margin, y);
    doc.text(`Contact: ${contactNumber || "-"}`, 300, y);
    y += 24;

    // Table headers
    doc.setFont(undefined, "bold");
    doc.text("Medicine", margin, y);
    doc.text("Qty", 280, y);
    doc.text("Price", 340, y);
    doc.text("Subtotal", 420, y);
    doc.setFont(undefined, "normal");
    y += 10;
    doc.line(margin, y, 550, y);
    y += 16;

    // Table rows
    invoiceItems.forEach((i) => {
      doc.text(i.name || "-", margin, y);
      doc.text(String(i.selectedQty || 0), 280, y);
      doc.text(currency(i.price || 0), 340, y);
      doc.text(currency(i.subtotal || 0), 420, y);
      y += 18;
    });

    // Total
    y += 8;
    doc.line(margin, y, 550, y);
    y += 22;
    doc.setFont(undefined, "bold");
    doc.text(`Total: ${currency(totalAmount)}`, 420, y);
    doc.setFont(undefined, "normal");

    // Open in new window (preview as real PDF)
    doc.output("dataurlnewwindow");
  };

  // ---------- Submit flow (preview first, then show CRUD bar) ----------
  const handleSubmitPreview = () => {
    if (!patientName || !contactNumber) {
      alert("Please fill Patient Name and Contact Number.");
      return;
    }
    if (invoiceItems.length === 0) {
      alert("Please add at least one medicine.");
      return;
    }
    renderPdf();
    setShowCrudBar(true);
  };

  // ---------- EXPORT (Save to DB) ----------
  const handleExport = async () => {
    if (exporting || saving) return;
    setExporting(true);
    setSaving(true);
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
          quantity: i.selectedQty,
          subtotal: i.subtotal,
        })),
        totalAmount,
      };
      const res = await axios.post(
        "http://localhost:5000/api/invoice/new",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const id = res?.data?.invoice_id;
      setSavedInvoiceId(id || null);
      alert("Invoice exported (saved) successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to export invoice.");
    } finally {
      setExporting(false);
      setSaving(false);
    }
  };

  // ---------- UPDATE (requires exported id) ----------
  const handleUpdate = async () => {
    if (!savedInvoiceId) return;
    if (updating) return;
    setUpdating(true);
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
          quantity: i.selectedQty,
          subtotal: i.subtotal,
        })),
        totalAmount,
      };
      await axios.put(
        `http://localhost:5000/api/invoice/${savedInvoiceId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Invoice updated!");
    } catch (e) {
      console.error(e);
      alert("Failed to update invoice.");
    } finally {
      setUpdating(false);
    }
  };

  // ---------- DELETE (requires exported id) ----------
  const handleDelete = async () => {
    if (!savedInvoiceId) return;
    if (!window.confirm("Delete this invoice permanently?")) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/invoice/${savedInvoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Invoice deleted.");
      handleAddNew(); // reset after deletion
    } catch (e) {
      console.error(e);
      alert("Failed to delete invoice.");
    } finally {
      setDeleting(false);
    }
  };

  // ---------- ADD (start a new invoice/reset) ----------
  const handleAddNew = async () => {
    setPatientName("");
    setContactNumber("");
    setInvoiceItems([]);
    setShowCrudBar(false);
    setSavedInvoiceId(null);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    // fetch a fresh invoice number
    try {
      const res = await axios.get("http://localhost:5000/api/invoice/last", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = nextInvoiceNumber(res?.data?.invoiceNumber);
      setInvoiceNumber(next);
    } catch {
      setInvoiceNumber(firstInvoiceForYear());
    }
  };

  // ---------- UI ----------
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: 20,
        minHeight: "100vh",
        background: "#f5f6fa",
      }}
    >
      <h1 style={{ marginBottom: 16, color: "#333" }}>Billing Dashboard</h1>

      {/* Patient + Invoice Meta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr",
          gap: 12,
          background: "#fff",
          padding: 16,
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}
      >
        <div>
          <label style={{ fontSize: 12, color: "#666" }}>Patient Name</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="e.g., John Doe"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#666" }}>Contact Number</label>
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="e.g., 9xxxxxxxxx"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#666" }}>Invoice No.</label>
          <input
            type="text"
            value={invoiceNumber}
            readOnly
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              background: "#f3f3f3",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#666" }}>Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            readOnly
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              background: "#f3f3f3",
              borderRadius: 8,
              marginTop: 6,
            }}
          />
        </div>
      </div>

      {/* Items Table */}
      <div
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Medicine</th>
              <th style={th}>Price</th>
              <th style={th}>Stock</th>
              <th style={th}>Qty</th>
              <th style={th}>Subtotal</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, idx) => (
              <tr key={item._id} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>{item.name}</td>
                <td style={td}>{currency(item.price)}</td>
                <td style={{ ...td, color: item.quantity === 0 ? "red" : "#333" }}>
                  {item.quantity === 0 ? "Out of Stock" : item.quantity}
                </td>
                <td style={td}>
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={item.selectedQty}
                    onChange={(e) => updateQuantity(idx, e.target.value)}
                    style={{
                      width: 70,
                      padding: 6,
                      borderRadius: 6,
                      border: "1px solid #ddd",
                    }}
                  />
                </td>
                <td style={td}>{currency(item.subtotal)}</td>
                <td style={td}>
                  <button
                    onClick={() => removeItem(item._id)}
                    style={btnDanger}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {invoiceItems.length === 0 && (
              <tr>
                <td style={{ ...td, padding: 18 }} colSpan={6}>
                  No items yet. Click “Add Medicine” to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add Medicine */}
        <div style={{ marginTop: 14, position: "relative" }}>
          <button
            onClick={() => setAddMedicineOpen((s) => !s)}
            style={btnPrimary}
          >
            + Add Medicine
          </button>

          {addMedicineOpen && (
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 0,
                width: 360,
                background: "#fff",
                border: "1px solid #e5e5e5",
                zIndex: 10,
                maxHeight: 280,
                overflowY: "auto",
                padding: 10,
                borderRadius: 10,
                boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
              }}
            >
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search medicine..."
                style={{
                  width: "100%",
                  padding: 8,
                  marginBottom: 8,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
              {(query ? suggestions : medicineList).map((m) => (
                <div
                  key={m._id}
                  onClick={() => addMedicineToInvoice(m)}
                  style={{
                    padding: "10px 8px",
                    borderBottom: "1px solid #f2f2f2",
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>
                    {m.name} {m.expiry_date && isExpired(m.expiry_date) && " (expired)"}
                  </span>
                  <span>{currency(m.price)}</span>
                </div>
              ))}
              {(query ? suggestions : medicineList).length === 0 && (
                <div style={{ padding: 8, color: "#777" }}>No matches</div>
              )}
            </div>
          )}
        </div>

        {/* Totals & Primary Action */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 16 }}>
            Total Amount: <b>{currency(totalAmount)}</b>
          </div>

          <button onClick={handleSubmitPreview} style={btnSuccess}>
            Submit Invoice (Preview PDF)
          </button>
        </div>
      </div>

      {/* CRUD / Export bar, visible after preview */}
      {showCrudBar && (
        <div
          style={{
            marginTop: 16,
            background: "#fff",
            padding: 16,
            borderRadius: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button onClick={handleAddNew} style={btnNeutral}>
            ADD (New Invoice)
          </button>

          <button
            onClick={handleUpdate}
            disabled={!savedInvoiceId || updating}
            style={{
              ...btnPrimary,
              opacity: !savedInvoiceId ? 0.6 : 1,
              cursor: !savedInvoiceId ? "not-allowed" : "pointer",
            }}
          >
            {updating ? "Updating..." : "UPDATE (Saved Invoice)"}
          </button>

          <button
            onClick={handleDelete}
            disabled={!savedInvoiceId || deleting}
            style={{
              ...btnDanger,
              opacity: !savedInvoiceId ? 0.6 : 1,
              cursor: !savedInvoiceId ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting..." : "DELETE (Saved Invoice)"}
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || saving}
            style={btnSuccess}
          >
            {exporting || saving ? "Exporting..." : "EXPORT (Save to DB)"}
          </button>
        </div>
      )}
    </div>
  );
};

// ---------- Small style helpers ----------
const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
  fontWeight: 600,
  color: "#333",
  fontSize: 13,
};

const td = {
  padding: "10px",
  fontSize: 13,
  color: "#333",
};

const btnBase = {
  padding: "10px 16px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary = {
  ...btnBase,
  background: "#2563eb",
  color: "#fff",
};

const btnSuccess = {
  ...btnBase,
  background: "#16a34a",
  color: "#fff",
};

const btnDanger = {
  ...btnBase,
  background: "#dc2626",
  color: "#fff",
};

const btnNeutral = {
  ...btnBase,
  background: "#e5e7eb",
  color: "#111827",
};

export default NewInvoice;
