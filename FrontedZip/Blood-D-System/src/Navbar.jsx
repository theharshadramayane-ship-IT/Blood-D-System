import React from "react";
import "./assets/Style.css";

import { Link } from "react-router-dom";

function Navbar() {

  return (

    <header className="navbar">

      <div className="logo">
        ❤️ Blood Bank
        <p>Save Blood, Save Life</p>
      </div>

      <nav>

        <Link to="/">Home</Link>

        <Link to="/login">
          Login
        </Link>

        <Link to="/resister">
          Register
        </Link>

      </nav>

    </header>
  );
}

export default Navbar;