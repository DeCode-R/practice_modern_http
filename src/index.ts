import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getPaginatedNotesSchema, getSingleNoteSchema } from "./schema";
import { updateNoteRequestSchema, createNoteRequestSchema } from "./schema";

import {
  Note,
  createNote,
  deleteNote,
  getAll,
  getNote,
  getNoteByText,
  getPaginated,
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
  const data = await c.req.json();

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
  let note: Note | undefined;

  try {
  //const note = await getNoteByText(data.text)
  } catch (error) {
      c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
 
    return c.json({ success, message});
  }
  if (note) {
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
  let note: Note | undefined;
  try {
    const found = await getNote( result.data )

  if (!found) {
    c.status(404);
    return c.json({ message: "note not found" });
  }
    note = found
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    return c.json({ success, message });
  }

  note = {
    id: note.id,
    text: validatedData.text || note.text,
    date: new Date(validatedData.date || note.date),
  };

  try {
    await updateNote(note.id, note);
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
    const found = await getNote( result.data )

  if (!found) {
    c.status(404);
    return c.json({ message: "note not found" });
  }
  } catch (error) {
    c.status(500);
    success = false;
    message = "Error retriving notes.";
    console.error("Error connecting to DB.", error);
    notes = [];
    return c.json({ success, message, notes });
  }

   
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

  const limit = parseInt(c.req.query("limit") || "10");
  const page = parseInt(c.req.query("page") || "1");

  const result = getPaginatedNotesSchema.safeParse({ limit, page});

  if (!result.success) {
    c.status(400);
    return c.json({
      success: false,
      message: JSON.parse(result.error.message)[0].message,
    });
  }

  try {
    notes = await getPaginated(result.data);
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
