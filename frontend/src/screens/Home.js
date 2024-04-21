import axios from "axios";
import React, { useState } from "react";
import DisplayImages from "./DALLE/components/DisplayImages";
import "./home.css";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5001",
});

function CreateImages() {
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState("");
  const [prompt, setPrompt] = useState("");
  const [jresult, setJresult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue) {
      setError("Please enter a prompt!");
      setPrompt("");
      setResult("");
      setJresult("");
      return;
    }
    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/createimages", {
        text: inputValue,
      });
      console.log({ response });
      if (response.status === 200) {
        const data = response.data;
        console.log(data);
        setPrompt(inputValue);
        if (data && data.length > 0) {
          const urls = data.map((item) => item.url);
          setImageUrls(urls);
        }
        setJresult(JSON.stringify(data, null, 2));
        setInputValue("");
        setError("");
      } else {
        throw new Error("An error occurred");
      }
    } catch (error) {
      console.log(error);
      setResult("");
      setError("An error occurred while submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <form className="form-horizontal" onSubmit={handleSubmit}>
        <div className="form-group row">
          <div className="col-sm-10 mt-2">
            <div className="form-floating">
              <textarea
                className="form-control custom-input"
                id="floatingInput"
                placeholder="Enter a value"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />

              <label htmlFor="floatingInput">Input</label>
            </div>
          </div>
          <div className="col-sm-2 mt-2">
            <button type="submit" className="btn btn-primary custom-button">
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      </form>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {prompt && <div className="alert alert-secondary mt-3">{prompt}</div>}
      <DisplayImages imageUrls={imageUrls} />
      {jresult && (
        <pre className="alert alert-info mt-3">
          <code>{jresult}</code>
        </pre>
      )}
    </div>
  );
}

export default CreateImages;
