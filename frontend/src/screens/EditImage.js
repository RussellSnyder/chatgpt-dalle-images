import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import DisplayImages from "./DALLE/components/DisplayImages";
import "./home.css";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5001",
});

function EditImage() {
  const canvasRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState("");
  const [prompt, setPrompt] = useState("");
  const [jresult, setJresult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [selectedImage, setSelectedImage] = useState();
  const [maskPoints, setMaskPoints] = useState([]);
  const [imagedGenerated, setImagedGenerated] = useState(false);

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

  const editImage = async (e) => {
    e.preventDefault();

    if (!inputValue) {
      setError("Please enter a prompt!");
      setPrompt("");
      setResult("");
      setJresult("");
      return;
    }
    setLoading(true);

    const scaledMaskPoints = maskPoints.map(({ x, y }) => ({
      x: x,
      y: y,
    }));

    try {
      const response = await axiosInstance.post("/api/editimage", {
        imageURL: selectedImage,
        points: scaledMaskPoints,
        prompt: inputValue,
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

  const handleReset = () => {
    setMaskPoints([]);
  };
  const handleImageUpload = (event) => {
    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = (e) => {
      setSelectedImage(e.target.result);
    };

    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // get the position and size of the canvas relative to the viewport
    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setMaskPoints((prev) => [...prev, { x, y }]);
  };

  useEffect(() => {
    if (selectedImage) {
      const image = new Image();
      image.src = selectedImage;
      image.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.style.background = `url(${selectedImage})`;
        canvas.style.backgroundSize = `cover`;
      };
    }
    handleReset();
  }, [selectedImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();

    maskPoints.forEach(({ x, y }, index) => {
      // if (index === 0) {
      //   context.moveTo(x, y);
      // } else {
      context.lineTo(x, y);
      // }
    });

    context.closePath();

    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "grey";
    context.fill();
  }, [maskPoints]);
  return (
    <div>
      <div className="container">
        <form className="form-horizontal">
          <div className="form-group row">
            <div className="col-sm-8 mt-2">
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
            <div className="col-sm-3 mt-2">
              <button
                onClick={editImage}
                className="btn btn-primary custom-button"
                disabled={loading || !selectedImage || maskPoints.length < 3}
              >
                {loading ? "Editing image" : "Edit Image"}
              </button>
            </div>
            <div className="col-sm-1 mt-2">
              <button
                onClick={handleReset}
                className="btn btn-secondary custom-button"
              >
                Reset
              </button>
            </div>
            <div className="col-sm-2 mt-2">
              <input
                className="btn btn-outline-secondary"
                type="file"
                onChange={handleImageUpload}
              />
            </div>
          </div>
          {imagedGenerated && (
            <div className="alert alert-success mt-3">
              images generated successfully!
            </div>
          )}
        </form>
        {error && <div className="alert alert-danger mt-3">{error}</div>}
        {prompt && <div className="alert alert-secondary mt-3">{prompt}</div>}
      </div>
      {selectedImage && (
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: "crosshair" }}
          />
          {maskPoints.map(({ x, y }, index) => (
            <div
              key={`${x}-${y}`}
              style={{
                position: "absolute",
                top: y - 2,
                left: x - 2,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "grey",
              }}
            />
          ))}
        </div>
      )}
      <DisplayImages imageUrls={imageUrls} />
      {jresult && (
        <pre className="alert alert-info mt-3">
          <code>{jresult}</code>
        </pre>
      )}
    </div>
  );
}

export default EditImage;
