const express = require("express");
const dotenv = require("dotenv");
const app = express();
const OpenAI = require("openai");
var cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const { loadImage, createCanvas } = require("canvas");
const sharp = require("sharp");
app.use(cors());

//environment variables
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const fs = require("fs");
const axios = require("axios");

app.post("/api/createimages", express.json(), async (req, res) => {
  //extract the text input from the request body
  //createImages
  async function createImages(prompt) {
    const response = await openai.images.generate({
      prompt,
      n: 1,
      size: "256x256",
      response_format: "url", //default
    });
    return response;
  }
  try {
    const { text } = req.body;

    // Pass the request text to the runCompletion function
    const output = await createImages(text);

    // Return the completion as a JSON response
    res.json(output.data);
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

app.post("/api/saveimage", express.json(), async (req, res) => {
  // Create the directory dalle_images if it doesn't exist
  const imageDirectory = path.join(__dirname, "dalle_images");
  if (!fs.existsSync(imageDirectory)) {
    fs.mkdirSync(imageDirectory);
  }

  try {
    // Extract the fileName and imageUrl from the request body
    const { fileName, imgURL } = req.body;

    // Construct the image path using the imageDirectory and fileName
    const imagePath = path.join(imageDirectory, fileName);

    // Check if the file already exists
    const fileExists = fs.existsSync(imagePath);
    console.log(imagePath);

    if (fileExists) {
      // Throw an error if an image with the same name already exists
      throw new Error("Image with the same name already exists");
    }

    // Create a writable stream for the image file using the image path
    const writer = fs.createWriteStream(path.join(imageDirectory, fileName));

    // Fetch the image from the imageUrl using axios
    //with the responseType set to 'stream'
    const response = await axios({
      method: "GET",
      url: imgURL,
      responseType: "stream",
    });

    if (response.status !== 200) {
      // Throw an error if the image fetching failed
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    // Set up event handlers for the finish and error events of the writable stream

    writer.on("finish", () => {
      // Handle the finish event, which indicates that the image has been saved successfully
      console.log("Image saved successfully: ", fileName);
      res.json({ message: "Image saved successfully" });
    });

    writer.on("error", (err) => {
      // Handle any errors that occur during the writing process
      console.log("Error saving the image ", err.message);
      throw new Error(err.message);
    });

    // Pipe the response data stream to the writable stream to save the image
    response.data.pipe(writer);
  } catch (error) {
    // Handle any errors that occur during the image saving process
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

app.post(
  "/api/editimage",
  bodyParser.json({
    limit: "50mb",
  }),
  async (req, res) => {
    try {
      const { imageURL, points, prompt } = req.body;

      console.log({ imageURL, points, prompt });
      // create directory to store original image
      const imageDirectory = path.join(__dirname, "dalle_edit");

      // create a random name of 13 character and time stamp for the original image
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const imageName = `${timestamp}_${randomString}`;
      // build the original image path
      const originalImagePath = path.join(
        imageDirectory,
        `${imageName}_original.png`
      );
      // save the original image to path above
      const imageBuffer = await axios.get(imageURL, {
        responseType: "arraybuffer",
      });

      fs.writeFileSync(
        originalImagePath,
        Buffer.from(imageBuffer.data, "binary")
      );

      // load image using canvas library
      const image = await loadImage(originalImagePath);

      console.log("image dimensions: ", image.width, image.height);
      // create a canvas of the same dimensions as the image
      const canvas = createCanvas(image.width, image.height);

      // create a drawing context
      const ctx = canvas.getContext("2d");

      // draw te original image on the canvas
      ctx.drawImage(image, 0, 0);

      // create a path using the mask points received from the request body
      ctx.beginPath();

      // ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();

      // apply the mask by setting the path as a clipping region
      ctx.clip();

      // Clear the masked area to make it fully transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // save the modified image to a specific file path
      const imagePath = path.join(imageDirectory, `${imageName}.png`);
      const writer = fs.createWriteStream(imagePath);
      const stream = canvas.createPNGStream();

      stream.pipe(writer);

      writer.on("finish", async () => {
        console.log("Image masked successfully: ", imagePath);

        async function run(prompt, imagePath) {
          const convertedImagePath = imagePath.replace(".png", "_rgba.png");
          await sharp(imagePath).ensureAlpha().toFile(convertedImagePath);

          console.log({ prompt });
          const response = await openai.images.edit({
            image: fs.createReadStream(convertedImagePath),
            prompt,
            // mask: undefined,
            // n: 1,
          });

          // Delete the converted image file after processing
          fs.unlinkSync(convertedImagePath);

          return response;
        }

        try {
          const output = await run(prompt, imagePath);
          console.log(output);
          res.json(output.data);
        } catch (error) {
          throw new Error(error.message);
        }
      });
      writer.on("error", () => {
        console.log("Error saving the image ", err.message);
        throw new Error(err.message);
      });
    } catch (error) {
      console.error("An error occured:", error);
      res.status(500).json({ error });
    }
  }
);

app.post(
  "/api/imagevariations",
  bodyParser.json({
    limit: "50mb",
  }),
  async (req, res) => {
    try {
      //extract imageURL, points and prompt from the request body
      const { imageURL, points, prompt } = req.body;

      //create a directory to store original images
      const imageDirectory = path.join(__dirname, "dalle_variations");

      //create a random name for the original image made of 13 characters + timestamp
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const imageName = `${timestamp}_${randomString}`;

      //build the original image path using the image name
      const originalImagePath = path.join(
        imageDirectory,
        `${imageName}_original.png`
      );

      //save the original image to the original image path built above
      const imageBuffer = await axios.get(imageURL, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(
        originalImagePath,
        Buffer.from(imageBuffer.data, "binary")
      );

      async function run(prompt, imagePath) {
        // Convert the input image to RGBA format
        const convertedImagePath = imagePath.replace(".png", "_rgba.png");
        await sharp(imagePath).ensureAlpha().toFile(convertedImagePath);
        const response = await openai.images.createVariation({
          image: fs.createReadStream(convertedImagePath),
          n: 2,
        });
        //Deleted the converted image file after processing
        fs.unlinkSync(convertedImagePath);

        return response;
      }
      try {
        // Send request to OPENAI to edit the masked image
        const output = await run(prompt, originalImagePath);

        // Return the output as a JSON response
        console.log(output.data);
        res.json(output.data);
      } catch (error) {
        console.log("error: ", error);
        res.status(500).json(error);
      }
    } catch (error) {
      console.error("An error occured:", error);
      res.status(500).json({ error });
    }
  }
);

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));
