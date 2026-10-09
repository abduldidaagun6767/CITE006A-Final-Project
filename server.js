const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" })); // photos arrive as base64 text
app.use(express.static(path.join(__dirname, "public")));

// ---------- temporary in-memory storage ----------
// Replaced by MongoDB in the next step (requirement #3).
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
let items = [
  { id: crypto.randomUUID(), type: "lost",  title: "Black Casio calculator", category: "Electronics", campus: "Manila", location: "Engineering Hall, Room 204", date: daysAgo(1), description: "fx-991 with a green sticker on the back.", contact: "maya@tip.edu.ph", photo: "", status: "open" },
  { id: crypto.randomUUID(), type: "found", title: "Student ID card", category: "Keys & Cards", campus: "Quezon City", location: "Cafeteria entrance", date: daysAgo(2), description: "Found near the tray return. Name starts with J. Santos.", contact: "Security desk, ext. 114", photo: "", status: "open" },
  { id: crypto.randomUUID(), type: "found", title: "Grey hoodie", category: "Clothing", campus: "Quezon City", location: "Gym bleachers", date: daysAgo(4), description: "Size M, university logo on the chest.", contact: "gym@tip.edu.ph", photo: "", status: "open" },
  { id: crypto.randomUUID(), type: "lost",  title: "Blue steel water bottle", category: "Bottles & Lunch", campus: "Manila", location: "Library, 2nd floor", date: daysAgo(6), description: "Dented at the bottom, sticker of a cat.", contact: "0917 555 0142", photo: "", status: "returned" }
];

const CAMPUSES = ["Manila", "Quezon City"];
const TYPES = ["lost", "found"];
const STATUSES = ["open", "returned"];

// Returns a clean item object, or an error message string
function validate(b) {
  const s = v => (typeof v === "string" ? v.trim() : "");
  const item = {
    type: s(b.type), title: s(b.title), category: s(b.category), campus: s(b.campus),
    location: s(b.location), date: s(b.date), description: s(b.description),
    contact: s(b.contact), photo: typeof b.photo === "string" ? b.photo : "",
    status: s(b.status) || "open"
  };
  if (!TYPES.includes(item.type)) return "Type must be 'lost' or 'found'.";
  if (!CAMPUSES.includes(item.campus)) return "Campus must be Manila or Quezon City.";
  if (!STATUSES.includes(item.status)) return "Status must be 'open' or 'returned'.";
  if (!item.title || !item.location || !item.contact || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    return "Title, location, contact and a valid date are required.";
  return item;
}

// ---------- API routes ----------
// READ all (optional filters: ?campus=Manila&type=lost&status=open&q=bottle)
app.get("/api/items", (req, res) => {
  const { campus, type, status, q } = req.query;
  const out = items.filter(i =>
    (!campus || i.campus === campus) && (!type || i.type === type) && (!status || i.status === status) &&
    (!q || [i.title, i.location, i.description].join(" ").toLowerCase().includes(String(q).toLowerCase()))
  );
  res.json(out);
});

// READ one
app.get("/api/items/:id", (req, res) => {
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found." });
  res.json(item);
});

// CREATE
app.post("/api/items", (req, res) => {
  const data = validate(req.body || {});
  if (typeof data === "string") return res.status(400).json({ error: data });
  const item = { id: crypto.randomUUID(), ...data, status: "open" };
  items.unshift(item);
  res.status(201).json(item);
});

// UPDATE
app.put("/api/items/:id", (req, res) => {
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Item not found." });
  const data = validate(req.body || {});
  if (typeof data === "string") return res.status(400).json({ error: data });
  items[idx] = { ...items[idx], ...data };
  res.json(items[idx]);
});

// DELETE
app.delete("/api/items/:id", (req, res) => {
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Item not found." });
  items.splice(idx, 1);
  res.status(204).end();
});

app.listen(PORT, () => console.log(`TIP Lost & Found running at http://localhost:${PORT}`));