import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";

// ✅ PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Request() {

  // ✅ DARK MODE
  const [darkMode, setDarkMode] = useState(false);

  // ✅ STATES
  const [requests, setRequests] = useState([]);

  const [patient, setPatient] = useState("");
  const [blood, setBlood] = useState("");
  const [hospital, setHospital] = useState("");
  const [units, setUnits] = useState("");
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

    // REQUEST DATA
    const savedRequests =
      JSON.parse(localStorage.getItem("requests")) || [];

    setRequests(savedRequests);

  }, []);

  // ✅ SAVE DATA
  const saveToLocal = (data) => {

    localStorage.setItem(
      "requests",
      JSON.stringify(data)
    );

    setRequests(data);

  };

  // ✅ PDF DOWNLOAD
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.text("Blood Request Report", 14, 15);

    autoTable(doc, {

      head: [["Patient", "Blood", "Hospital", "Units", "Status"]],

      body: requests.map((r) => [
        r.patient,
        r.blood,
        r.hospital,
        r.units,
        r.status,
      ]),

    });

    doc.save("request-report.pdf");

    toast.success("PDF Downloaded ✅");

  };

  // ✅ ADD / UPDATE
  const handleSubmit = (e) => {

    e.preventDefault();

    const requestData = {
      patient,
      blood,
      hospital,
      units,
      status,
    };

    let updatedRequests = [...requests];

    // ✅ UPDATE
    if (editIndex !== null) {

      updatedRequests[editIndex] = requestData;

      toast.success("Request Updated ✅");

      setEditIndex(null);

    } else {

      // ✅ ADD
      updatedRequests.push(requestData);

      toast.success("Request Added ✅");

    }

    saveToLocal(updatedRequests);

    // ✅ CLEAR
    setPatient("");
    setBlood("");
    setHospital("");
    setUnits("");
    setStatus("");

  };

// ✅ DELETE
const handleDelete = (index) => {

  const confirmDelete =
    window.confirm(
      "Are you sure you want to delete?"
    );

  if(confirmDelete){

    const updatedRequests =
      requests.filter((_, i) => i !== index);

    saveToLocal(updatedRequests);

    toast.error("Request Deleted ❌");

  }

};

  // ✅ EDIT
  const handleEdit = (index) => {

    const r = requests[index];

    setPatient(r.patient);
    setBlood(r.blood);
    setHospital(r.hospital);
    setUnits(r.units);
    setStatus(r.status);

    setEditIndex(index);

  };

  // ✅ SEARCH FILTER
  const filteredRequests = requests.filter((r) =>

    r.patient.toLowerCase().includes(search.toLowerCase()) ||

    r.blood.toLowerCase().includes(search.toLowerCase()) ||

    r.hospital.toLowerCase().includes(search.toLowerCase())

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

        <h1>Blood Request</h1>

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
            placeholder="Patient Name"
            required
            value={patient}
            onChange={(e) =>
              setPatient(e.target.value)
            }
          />

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
            type="text"
            placeholder="Hospital Name"
            required
            value={hospital}
            onChange={(e) =>
              setHospital(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Units Needed"
            required
            value={units}
            onChange={(e) =>
              setUnits(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Pending / Approved"
            required
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          />

          <button type="submit">

            {editIndex !== null
              ? "Update Request"
              : "Add Request"}

          </button>

        </form>

        {/* ✅ TABLE */}
        <table>

          <thead>

            <tr>
              <th>Patient</th>
              <th>Blood</th>
              <th>Hospital</th>
              <th>Units</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredRequests.map((r, index) => (

              <tr key={index}>

                <td>{r.patient}</td>
                <td>{r.blood}</td>
                <td>{r.hospital}</td>
                <td>{r.units}</td>
                <td>{r.status}</td>

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

export default Request;