import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getSingleNoteSchema } from "./schema";
import { updateNoteRequestSchema, createNoteRequestSchema } from "./schema";

import {
  Note,
  createNote,
  deleteNote,
  getAll,
  getNote,
  updateNote,
} from "./notes";

const app = new Hono();

app.use("*", secureHeaders());

app.use("*", compress());

app.use(
  "*",
  cors({
    origin: ["https://seen.red"],
  }),
);
// CREATE
app.post("/", async (c) => {
  let data: unknown;

  try {
    data = await c.req.json();
  } catch (error) {
    console.error(error);
    c.status(400);
    return c.json({
      success: false,
      message: "Invalid JSON in the request",
    });
  }

  const validation = createNoteRequestSchema.safeParse(data);

  if (!validation.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(validation.error.message)[0],
    });
  }

  const validatedData = validation.data;
  let success = true;
  let message = "successfully retrieved";
  let notes: Note[];

  try {
    notes = await getAll();
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    notes = [];
    return c.json({ success, message, notes });
  }
  if (notes.find((x) => x.text === validatedData.text)) {
    return c.json({ message: "already exists" });
  }

  const newNote: Partial<Note> = {
    text: validatedData.text || validatedData.text,
    date: new Date(validatedData.date || Date.now()),
  };

  let dbNote: Note;

  try {
    dbNote = await createNote(newNote);
  } catch (error) {
    console.error(error);
    c.status(500);
    return c.json({ success: false, message: "Error in updating the note" });
  }

  notes.push(dbNote);

  return c.json({
    success,
    message: "successfully added the note",
    note: dbNote,
  });
});

//READ
app.get("/:id", async (c) => {
  const result = getSingleNoteSchema.safeParse(c.req.param("id"));

  if (!result.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(result.error.message)[0].message,
    });
  }
  const id = result.data;

  let note: Note | undefined;
  let success = true;
  let message = "A note found";

  try {
    note = await getNote(id);
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error connecting to the database.";
    console.error("Error connecting to DB.", error);
    return c.json({ success, message });
  }

  if (!note) {
    c.status(404);
    return c.json({ message: "note not found" });
  }

  return c.json({ success, message, note });
});

// UPDATE
app.put("/:id", async (c) => {
  const result = getSingleNoteSchema.safeParse(c.req.param("id"));

  if (!result.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(result.error.message)[0].message,
    });
  }

  const id = result.data;

  let data: unknown;
  try {
    data = await c.req.json();
  } catch (error) {
    console.error(error);
    c.status(400);
    return c.json({
      success: false,
      message: "Invalid JSON in the request",
    });
  }

  const validation = updateNoteRequestSchema.safeParse(data);

  if (!validation.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(validation.error.message)[0],
    });
  }

  const validatedData = validation.data;

  let success = true;
  let message = "successfully retrieved";
  let notes: Note[];
  try {
    notes = await getAll();
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    notes = [];
    return c.json({ success, message, notes });
  }
  const foundIndex = notes.findIndex((n) => n.id === id);

  if (foundIndex === -1) {
    c.status(404);
    return c.json({ message: "note not found" });
  }

  notes[foundIndex] = {
    id: notes[foundIndex].id,
    text: validatedData.text || notes[foundIndex].text,
    date: new Date(validatedData.date || notes[foundIndex].date),
  };

  try {
    await updateNote(notes[foundIndex].id, notes[foundIndex]);
  } catch (error) {
    console.error(error);
    c.status(500);
    return c.json({ success: false, message: "Error in updating the note" });
  }
  return c.json({ success: true, message: "successfully updated" });
});

// DELETE
app.delete("/:id", async (c) => {
  const result = getSingleNoteSchema.safeParse(c.req.param("id"));

  if (!result.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(result.error.message)[0].message,
    });
  }

  const id = parseInt(c.req.param("id"));

  let success = true;
  let message = "successfully retrieved";
  let notes: Note[];
  try {
    notes = await getAll();
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    notes = [];
    return c.json({ success, message, notes });
  }

  const foundIndex = notes.findIndex((n) => n.id === id);

  if (foundIndex === -1) {
    c.status(404);
    return c.json({ message: "note not found" });
  }

  notes.splice(foundIndex, 1);

  try {
    await deleteNote(id);
  } catch (error) {
    console.error(error);
    c.status(500);
    return c.json({ success: false, message: "Error in deleting the note" });
  }

  return c.json({ success, message: "successfully deleted" });
});

// LIST
app.get("/", async (c) => {
  let success = true;
  let message = "successfully retrieved";
  let notes: Note[];

  try {
    notes = await getAll();
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    notes = [];
  }

  return c.json({ success, message, notes });
});
serve(app);
