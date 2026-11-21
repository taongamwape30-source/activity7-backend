const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const COLS = "id, title, category, description, status";

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : null;
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }
  const v = {};
  for (const f of ["title", "category", "description", "status"]) {
    if (typeof body[f] !== "string") {
      return { error: `${f[0].toUpperCase() + f.slice(1)} is required and must be text.` };
    }
    v[f] = body[f].trim();
  }
  if (v.title.length < 3 || v.title.length > 80) return { error: "Title must have 3 to 80 characters." };
  if (v.category.length < 2 || v.category.length > 40) return { error: "Category must have 2 to 40 characters." };
  if (v.description.length < 5 || v.description.length > 300) return { error: "Description must have 5 to 300 characters." };
  if (!STATUSES.includes(v.status)) return { error: "Status must be Pending, In progress or Completed." };
  return { value: v };
}

const badId = res => res.status(400).json({ message: "Id must be a positive whole number." });
const notFound = res => res.status(404).json({ message: "Record not found." });

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLS} FROM records ORDER BY id`);
    res.status(200).json(result.rows);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);
    const result = await pool.query(`SELECT ${COLS} FROM records WHERE id = $1`, [id]);
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { value, error } = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [value.title, value.category, value.description, value.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);
    const { value, error } = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const result = await pool.query(
      `UPDATE records SET title = $1, category = $2, description = $3, status = $4 WHERE id = $5 RETURNING ${COLS}`,
      [value.title, value.category, value.description, value.status, id]
    );
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);
    const result = await pool.query("DELETE FROM records WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json({ message: "Record deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
