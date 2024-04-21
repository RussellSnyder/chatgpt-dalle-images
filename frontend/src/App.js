import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import EditImage from "./screens/EditImage";
import GenerateVariations from "./screens/GenerateVariations";
import Home from "./screens/Home";
import "./styles/bootstrap-custom.scss";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" exact element={<Home />} />
        <Route path="/edit-image" exact element={<EditImage />} />
        <Route
          path="/image-variations"
          exact
          element={<GenerateVariations />}
        />
      </Routes>
    </Router>
  );
};

export default App;
