require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const engine = require("ejs-mate"); //for layout
const mongoose = require('mongoose');
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const { nanoid } = require("nanoid");
const validator = require("validator");
const Url = require("./models/url.js");
const port = process.env.PORT;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", engine);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));


let MONGO_URL = process.env.MONGO_URL;

main()
    .then(() => {
        console.log("Database connected successfully");
        app.listen(port, () => {
            console.log(`Server is listing to port: ${port}`);
        })
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

function asyncWrap(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(err => next(err));
    }
};

//Home page
app.get("/", (req, res) => {
    res.send("Welcome to SnapLink");
});

//form to generate short url
app.get("/urls/new", (req, res) => {
    res.render("urls/index.ejs");
});

//Frontend calls this when user clicks "Generate" button
//Returns a random 7-char code as JSON
app.get("/urls/generate", asyncWrap((req, res) => {
    const code = nanoid(7);
    res.json({ shortCode: code });
}));

// Called by frontend JS when user clicks "AI Alias" button
// Sends long URL to Gemini, gets back a short alias
// Returns JSON: { shortCode: "react-docs" }
app.post("/urls/ai-alias", asyncWrap(async (req, res) => {
    try {
        const { originalUrl } = req.body;
        // Step 1: Validate URL exists and is valid
        if (!originalUrl || !validator.isURL(originalUrl)) {
            return res.status(400).json({ error: "Please enter a valid URL first" });
        }
        //built the prompt
        const prompt = `Given this URL: ${originalUrl}

Generate ONE short, memorable alias for a URL shortener.

Rules:
- 2 to 4 words maximum
- Use hyphens between words
- Lowercase letters only
- No spaces
- No special characters except hyphens
- Maximum 25 characters total
- Make it relevant to the URL content/topic
- If unsure, generate a generic clean alias

Output requirements:
- Reply with ONLY the alias
- No explanation
- No quotes
- No punctuation
- No extra text
- No new lines

Examples:
react-docs
yt-music
github-profile
news-today`;

        // Step 3: Call Gemini using the SDK
        const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt
        });
        const rawAlias = result.text;

        const cleanAlias = rawAlias.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 25);

        if (!cleanAlias) {
            return res.status(500).json({ error: "AI returned an empty alias. Try again." });
        }
        res.json({ shortCode: cleanAlias });

    }
    catch (err) {
        console.error("Gemini SDK error:", err.message);
        res.status(500).json({ error: "AI alias generation failed. Try again." });
    }
}));

// to save url to db
app.post("/urls", asyncWrap(async (req, res) => {
    let { originalUrl, shortCode } = req.body.url;
    if (!validator.isURL(originalUrl)) {
        return res.send("Invalid URL");
    }
    if (!shortCode || shortCode.trim() === "") {
        return res.send("Short code is required");
    }
    let originalUrlExist = await Url.findOne({ originalUrl });
    if (originalUrlExist) {
        return res.send("short url already exist");
    }
    const newUrl = new Url(req.body.url);
    newUrl.shortCode = shortCode;
    await newUrl.save();
    res.send(newUrl.shortCode);
}));


//to redirect to short code
app.get("/:shortCode", asyncWrap(async (req, res) => {
    let { shortCode } = req.params;
    const foundUrl = await Url.findOne({ shortCode });
    if (!foundUrl) {
        return res.send("Short URL not found");
    }
    foundUrl.clicks += 1;
    await foundUrl.save();
    res.redirect(foundUrl.originalUrl);
}));

//404 handler — no route matched 
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

//Global error handler — all errors land here
app.use((err, req, res, next) => {
    const { status = 500, message = "Something went wrong" } = err;
    res.status(status).send(`
        <h1>${status} Error</h1>
        <p>${message}</p>
        <a href="/">Go home</a>
    `);
});