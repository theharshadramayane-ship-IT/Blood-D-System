import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";

// ✅ PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Camps() {

  // ✅ DARK MODE
  const [darkMode, setDarkMode] = useState(false);

  // ✅ STATES
  const [camps, setCamps] = useState([]);

  const [campName, setCampName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [organizer, setOrganizer] = useState("");

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

    // CAMPS DATA
    const savedCamps =
      JSON.parse(localStorage.getItem("camps")) || [];

    setCamps(savedCamps);

  }, []);

  // ✅ SAVE DATA
  const saveToLocal = (data) => {

    localStorage.setItem(
      "camps",
      JSON.stringify(data)
    );

    setCamps(data);

  };

  // ✅ PDF DOWNLOAD
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.text("Blood Donation Camps Report", 14, 15);

    autoTable(doc, {

      head: [["Camp Name", "Location", "Date", "Organizer"]],

      body: camps.map((c) => [
        c.campName,
        c.location,
        c.date,
        c.organizer,
      ]),

    });

    doc.save("camps-report.pdf");

    toast.success("PDF Downloaded ✅");

  };

  // ✅ ADD / UPDATE
  const handleSubmit = (e) => {

    e.preventDefault();

    const campData = {
      campName,
      location,
      date,
      organizer,
    };

    let updatedCamps = [...camps];

    // ✅ UPDATE
    if (editIndex !== null) {

      updatedCamps[editIndex] = campData;

      toast.success("Camp Updated ✅");

      setEditIndex(null);

    } else {

      // ✅ ADD
      updatedCamps.push(campData);

      toast.success("Camp Added ✅");

    }

    saveToLocal(updatedCamps);

    // ✅ CLEAR
    setCampName("");
    setLocation("");
    setDate("");
    setOrganizer("");

  };

// ✅ DELETE
const handleDelete = (index) => {

  const confirmDelete =
    window.confirm(
      "Are you sure you want to delete?"
    );

  if(confirmDelete){

    const updatedCamps =
      camps.filter((_, i) => i !== index);

    saveToLocal(updatedCamps);

    toast.error("Camp Deleted ❌");

  }

};

  // ✅ EDIT
  const handleEdit = (index) => {

    const c = camps[index];

    setCampName(c.campName);
    setLocation(c.location);
    setDate(c.date);
    setOrganizer(c.organizer);

    setEditIndex(index);

  };

  // ✅ SEARCH FILTER
  const filteredCamps = camps.filter((c) =>

    c.campName.toLowerCase().includes(search.toLowerCase()) ||

    c.location.toLowerCase().includes(search.toLowerCase()) ||

    c.organizer.toLowerCase().includes(search.toLowerCase())

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

        <h1>Blood Donation Camps</h1>

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
            placeholder="Camp Name"
            required
            value={campName}
            onChange={(e) =>
              setCampName(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Location"
            required
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          />

          <input
            type="date"
            required
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Organizer Name"
            required
            value={organizer}
            onChange={(e) =>
              setOrganizer(e.target.value)
            }
          />

          <button type="submit">

            {editIndex !== null
              ? "Update Camp"
              : "Add Camp"}

          </button>

        </form>

        {/* ✅ TABLE */}
        <table>

          <thead>

            <tr>
              <th>Camp Name</th>
              <th>Location</th>
              <th>Date</th>
              <th>Organizer</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredCamps.map((c, index) => (

              <tr key={index}>

                <td>{c.campName}</td>
                <td>{c.location}</td>
                <td>{c.date}</td>
                <td>{c.organizer}</td>

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

export default Camps;