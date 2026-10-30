

import React from "react";
import './assets/Style.css'


import { Link, useNavigate } from "react-router-dom";

function Home() {

  const navigate = useNavigate();

  return (
    <>

      {/* NAVBAR */}
      <header className="navbar">

        <div className="logo">
          ❤️ Blood Bank
          <p>Save Blood, Save Life</p>
        </div>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>

      </header>

      {/* HERO */}
      <section className="hero">

        <div className="hero-text">

          <h1>Donate Blood, Save Life ❤️</h1>

          <p>Your one donation can save up to 3 lives</p>

          <button onClick={() => navigate("/resister")}>
            Become a Donor
          </button>

        </div>

      </section>

      {/* INFO CARD */}
      <section className="info-card">

        <div className="info-text">

          <h1>BLOOD DONATION</h1>

          <p>
            Blood donation is a noble act that helps save lives and brings hope.
          </p>

        </div>

      </section>

      {/* FEATURES */}
      <section className="features">

        <div className="card">
          <h3>Easy Registration</h3>
          <p>Register quickly and become a donor.</p>
        </div>

        <div className="card">
          <h3>Find Donors</h3>
          <p>Search donors easily in emergencies.</p>
        </div>

        <div className="card">
          <h3>Save Lives</h3>
          <p>Your donation can save multiple lives.</p>
        </div>

      </section>

    </>
  );
}

export default Home;