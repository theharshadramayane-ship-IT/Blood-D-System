import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";

// ✅ PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Stock() {

  // ✅ DARK MODE
  const [darkMode, setDarkMode] = useState(false);

  // ✅ STATES
  const [stocks, setStocks] = useState([]);

  const [blood, setBlood] = useState("");
  const [units, setUnits] = useState("");
  const [hospital, setHospital] = useState("");

  // ✅ SEARCH
  const [search, setSearch] = useState("");

  // ✅ EDIT
  const [editIndex, setEditIndex] = useState(null);

  // ✅ TOTAL UNITS
  const [totalUnits, setTotalUnits] = useState(0);

  // ✅ LOAD DATA
  useEffect(() => {

    // DARK MODE
    const savedTheme =
      localStorage.getItem("darkMode");

    if (savedTheme === "true") {

      setDarkMode(true);

    }

    // STOCK DATA
    const savedStocks =
      JSON.parse(localStorage.getItem("stocks")) || [];

    setStocks(savedStocks);

    // ✅ TOTAL UNITS CALCULATE
    const total = savedStocks.reduce(

      (sum, item) =>
        sum + Number(item.units),

      0

    );

    setTotalUnits(total);

  }, []);

  // ✅ SAVE DATA
  const saveToLocal = (data) => {

    localStorage.setItem(
      "stocks",
      JSON.stringify(data)
    );

    setStocks(data);

    // ✅ UPDATE TOTAL UNITS
    const total = data.reduce(

      (sum, item) =>
        sum + Number(item.units),

      0

    );

    setTotalUnits(total);

  };

  // ✅ PDF DOWNLOAD
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.text("Blood Stock Report", 14, 15);

    autoTable(doc, {

      head: [["Blood Group", "Units", "Hospital"]],

      body: stocks.map((s) => [
        s.blood,
        s.units,
        s.hospital,
      ]),

    });

    doc.save("stock-report.pdf");

    toast.success("PDF Downloaded ✅");

  };

  // ✅ ADD / UPDATE
  const handleSubmit = (e) => {

    e.preventDefault();

    const stockData = {
      blood,
      units,
      hospital,
    };

    let updatedStocks = [...stocks];

    // ✅ UPDATE
    if (editIndex !== null) {

      updatedStocks[editIndex] = stockData;

      toast.info("Stock Updated ✅");

      setEditIndex(null);

    } else {

      // ✅ ADD
      updatedStocks.push(stockData);

      toast.success("Stock Added ✅");

    }

    saveToLocal(updatedStocks);

    // ✅ CLEAR
    setBlood("");
    setUnits("");
    setHospital("");

  };

  // ✅ DELETE
  const handleDelete = (index) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete?"
      );

    if(confirmDelete){

      const updatedStocks =
        stocks.filter((_, i) => i !== index);

      saveToLocal(updatedStocks);

      toast.error("Stock Deleted ❌");

    }

  };

  // ✅ EDIT
  const handleEdit = (index) => {

    const s = stocks[index];

    setBlood(s.blood);
    setUnits(s.units);
    setHospital(s.hospital);

    setEditIndex(index);

  };

  // ✅ SEARCH FILTER
  const filteredStocks = stocks.filter((s) =>

    s.blood.toLowerCase().includes(search.toLowerCase()) ||

    s.hospital.toLowerCase().includes(search.toLowerCase())

  );

  return (

    <div
      className={
        darkMode
          ? "dashboard-container dark"
          : "dashboard-container"
      }
    >

      {/* ✅ SIDEBAR */}
      <Sidebar />

      <div className="main-content">

        <h1>Blood Stock</h1>

        {/* ✅ TOTAL UNITS */}
        <h2 className="total-units">

          Total Blood Units :
          {totalUnits}

        </h2>

        {/* ✅ SEARCH + PDF */}
        <div className="top-bar">

          <input
            type="text"
            id="search"
            placeholder="Search..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <button
            className="pdf-btn"
            onClick={downloadPDF}
          >
            Download PDF
          </button>

        </div>

        {/* ✅ FORM */}
        <form
          className="form-container"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            placeholder="Blood Group"
            required
            value={blood}
            onChange={(e) =>
              setBlood(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Units"
            required
            value={units}
            onChange={(e) =>
              setUnits(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Hospital Name"
            required
            value={hospital}
            onChange={(e) =>
              setHospital(e.target.value)
            }
          />

          <button type="submit">

            {editIndex !== null
              ? "Update Stock"
              : "Add Stock"}

          </button>

        </form>

        {/* ✅ TABLE */}
        <table>

          <thead>

            <tr>
              <th>Blood Group</th>
              <th>Units</th>
              <th>Hospital</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredStocks.map((s, index) => (

              <tr key={index}>

                <td>{s.blood}</td>
                <td>{s.units}</td>
                <td>{s.hospital}</td>

                <td>

                  <button
                    onClick={() =>
                      handleEdit(index)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(index)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Stock;