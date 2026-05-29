const mongoose = require("mongoose");
const { Schema } = mongoose;

const urlSchema = new Schema({
    originalUrl: {
        type: String,
        required: true,
    },
    shortCode: {
        type: String,
        required: true,
        unique: true,
        // sparse:true,
    },
    aliasType:{
        type:String,
        enum:["nanoid","ai","custom"],
        default:"nanoid",
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
    },
    clicks: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Url", urlSchema);