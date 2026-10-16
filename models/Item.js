const mongoose = require("mongoose");

// One document = one lost or found report
const itemSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: ["lost", "found"], required: true },
    title:       { type: String, required: true, trim: true },
    category:    { type: String, default: "Other", trim: true },
    campus:      { type: String, enum: ["Manila", "Quezon City"], required: true },
    location:    { type: String, required: true, trim: true },
    date:        { type: String, required: true },           // "YYYY-MM-DD"
    description: { type: String, default: "", trim: true },
    contact:     { type: String, required: true, trim: true },
    photo:       { type: String, default: "" },              // resized image as base64 text
    status:      { type: String, enum: ["open", "returned"], default: "open" }
  },
  { timestamps: true }
);

// Send "id" to the front end instead of MongoDB's "_id" and "__v"
itemSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Item", itemSchema);