require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const Item = require("./models/Item");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const CAMPUSES = ["Manila", "Quezon City"];
const TYPES = ["lost", "found"];
const STATUSES = ["open", "returned"];

function validate(b) {
  const s = v => typeof v === "string" ? v.trim() : "";
  const item = {
    type: s(b.type),
    title: s(b.title),
    category: s(b.category) || "Other",
    campus: s(b.campus),
    location: s(b.location),
    date: s(b.date),
    description: s(b.description),
    contact: s(b.contact),
    photo: typeof b.photo === "string" ? b.photo : "",
    status: s(b.status) || "open"
  };

  if (!TYPES.includes(item.type))
    return "Type must be 'lost' or 'found'.";
  if (!CAMPUSES.includes(item.campus))
    return "Campus must be Manila or Quezon City.";
  if (!STATUSES.includes(item.status))
    return "Status must be 'open' or 'returned'.";
  if (!item.title || !item.location || !item.contact ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    return "Title, location, contact and a valid date are required.";

  return item;
}

const wrap = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err => {
    if (err.name === "ValidationError")
      return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Server error. Please try again." });
  });

const notFound = res =>
  res.status(404).json({ error: "Item not found." });

// READ all items with optional filters
app.get("/api/items", wrap(async (req, res) => {
  const { campus, type, status, q } = req.query;
  const filter = {};

  if (campus) filter.campus = String(campus);
  if (type) filter.type = String(type);
  if (status) filter.status = String(status);

  if (q) {
    const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [
      { title: rx },
      { location: rx },
      { description: rx }
    ];
  }

  res.json(await Item.find(filter).sort({ createdAt: -1 }));
}));

// READ one item
app.get("/api/items/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const item = await Item.findById(req.params.id);
  if (!item) return notFound(res);
  res.json(item);
}));

// CREATE an item
app.post("/api/items", wrap(async (req, res) => {
  const data = validate(req.body || {});
  if (typeof data === "string")
    return res.status(400).json({ error: data });

  const item = await Item.create({ ...data, status: "open" });
  res.status(201).json(item);
}));

// UPDATE an item
app.put("/api/items/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const data = validate(req.body || {});
  if (typeof data === "string")
    return res.status(400).json({ error: data });

  const item = await Item.findByIdAndUpdate(
    req.params.id, data, { new: true, runValidators: true }
  );
  if (!item) return notFound(res);
  res.json(item);
}));

// DELETE an item
app.delete("/api/items/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return notFound(res);
  res.status(204).end();
}));

const daysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const SAMPLES = [
  {
    type: "lost", title: "Black Casio calculator",
    category: "Electronics", campus: "Manila",
    location: "Engineering Hall, Room 204", date: daysAgo(1),
    description: "fx-991 with a green sticker on the back.",
    contact: "maya@tip.edu.ph"
  },
  {
    type: "found", title: "Student ID card",
    category: "Keys & Cards", campus: "Quezon City",
    location: "Cafeteria entrance", date: daysAgo(2),
    description: "Found near the tray return. Name starts with J. Santos.",
    contact: "Security desk, ext. 114"
  },
  {
    type: "found", title: "Grey hoodie",
    category: "Clothing", campus: "Quezon City",
    location: "Gym bleachers", date: daysAgo(4),
    description: "Size M, university logo on the chest.",
    contact: "gym@tip.edu.ph"
  },
  {
    type: "lost", title: "Blue steel water bottle",
    category: "Bottles & Lunch", campus: "Manila",
    location: "Library, 2nd floor", date: daysAgo(6),
    description: "Dented at the bottom, sticker of a cat.",
    contact: "0917 555 0142",
    status: "returned"
  }
];

async function start() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI. Check your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("Connected to MongoDB:", mongoose.connection.name);

    if (await Item.countDocuments() === 0) {
      await Item.insertMany(SAMPLES);
      console.log("Empty database: added 4 sample items.");
    }

    app.listen(PORT, () => {
      console.log(`TIP Lost & Found running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  }
}

start();