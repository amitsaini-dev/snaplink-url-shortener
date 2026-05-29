const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const engine = require("ejs-mate"); //for layout
const mongoose = require('mongoose');

const { nanoid } = require("nanoid");
const validator = require("validator");
const Url = require("./models/url.js");
const port = 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", engine);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));


let MONGO_URL = "mongodb://127.0.0.1:27017/snaplink";

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

app.get("/", (req, res) => {
    res.send("Welcome to SnapLink");
});

app.get("/urls/new", (req, res) => {
    res.render("urls/index.ejs");
});

app.post("/urls", async (req, res) => {
    let { originalUrl } = req.body.url;
    if (!validator.isURL(originalUrl)) {
        return res.send("Invalid URL");
    }
    let originalUrlExist = await Url.findOne({ originalUrl });
    if (originalUrlExist) {
        return res.send("short url already exist");
    }
    const newUrl = new Url(req.body.url);
    newUrl.shortCode = nanoid(7);
    await newUrl.save();
    res.send(newUrl.shortCode);
});

app.get("/:shortCode", async (req, res) => {
    let { shortCode } = req.params;
    const foundUrl = await Url.findOne({ shortCode });
    foundUrl.clicks += 1;
    await foundUrl.save();
    if (!foundUrl) {
        return res.send("Short URL not found");
    }
    res.redirect(foundUrl.originalUrl);
});