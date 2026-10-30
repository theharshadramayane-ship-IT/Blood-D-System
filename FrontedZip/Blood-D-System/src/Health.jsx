import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";

// ✅ PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Health() {

  // ✅ DARK MODE
  const [darkMode, setDarkMode] = useState(false);

  // ✅ STATES
  const [healths, setHealths] = useState([]);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [bp, setBp] = useState("");
  const [status, setStatus] = useState("");

  // ✅ SEARCH
  const [search, setSearch] = useState("");

  // ✅ EDIT
  const [editIndex, setEditIndex] = useState(null);

  // ✅ LOAD DATA
  useEffect(() => {

    // DARK MODE
    const savedTheme =
      localStorage.getItem("darkMode");

    if (savedTheme === "true") {

      setDarkMode(true);

    }

    // HEALTH DATA
    const savedHealths =
      JSON.parse(localStorage.getItem("healths")) || [];

    setHealths(savedHealths);

  }, []);

  // ✅ SAVE DATA
  const saveToLocal = (data) => {

    localStorage.setItem(
      "healths",
      JSON.stringify(data)
    );

    setHealths(data);

  };

  // ✅ PDF DOWNLOAD
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.text("Health Report", 14, 15);

    autoTable(doc, {

      head: [[
        "Name",
        "Age",
        "Weight",
        "BP",
        "Status"
      ]],

      body: healths.map((h) => [
        h.name,
        h.age,
        h.weight,
        h.bp,
        h.status,
      ]),

    });

    doc.save("health-report.pdf");

    toast.success("PDF Downloaded ✅");

  };

  // ✅ ADD / UPDATE
  const handleSubmit = (e) => {

    e.preventDefault();

    const healthData = {
      name,
      age,
      weight,
      bp,
      status,
    };

    let updatedHealths = [...healths];

    // ✅ UPDATE
    if (editIndex !== null) {

      updatedHealths[editIndex] = healthData;

      toast.success("Health Updated ✅");

      setEditIndex(null);

    } else {

      // ✅ ADD
      updatedHealths.push(healthData);

      toast.success("Health Added ✅");

    }

    saveToLocal(updatedHealths);

    // ✅ CLEAR
    setName("");
    setAge("");
    setWeight("");
    setBp("");
    setStatus("");

  };

 // ✅ DELETE
const handleDelete = (index) => {

  const confirmDelete =
    window.confirm(
      "Are you sure you want to delete?"
    );

  if(confirmDelete){

    const updatedHealths =
      healths.filter((_, i) => i !== index);

    saveToLocal(updatedHealths);

    toast.error("Health Deleted ❌");

  }

};

  // ✅ EDIT
  const handleEdit = (index) => {

    const h = healths[index];

    setName(h.name);
    setAge(h.age);
    setWeight(h.weight);
    setBp(h.bp);
    setStatus(h.status);

    setEditIndex(index);

  };

  // ✅ SEARCH FILTER
  const filteredHealths = healths.filter((h) =>

    h.name.toLowerCase().includes(search.toLowerCase()) ||

    h.status.toLowerCase().includes(search.toLowerCase())

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

        <h1>Health Screening</h1>

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
            placeholder="Donor Name"
            required
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Age"
            required
            value={age}
            onChange={(e) =>
              setAge(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Weight"
            required
            value={weight}
            onChange={(e) =>
              setWeight(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Blood Pressure"
            required
            value={bp}
            onChange={(e) =>
              setBp(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Fit / Unfit"
            required
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          />

          <button type="submit">

            {editIndex !== null
              ? "Update"
              : "Add Health"}

          </button>

        </form>

        {/* ✅ TABLE */}
        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Weight</th>
              <th>BP</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredHealths.map((h, index) => (

              <tr key={index}>

                <td>{h.name}</td>
                <td>{h.age}</td>
                <td>{h.weight}</td>
                <td>{h.bp}</td>
                <td>{h.status}</td>

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

export default Health;