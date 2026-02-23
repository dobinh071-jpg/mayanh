import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

let supabase: any = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Checking Supabase credentials...");
console.log("SUPABASE_URL exists:", !!supabaseUrl);
console.log("SUPABASE_KEY exists:", !!supabaseKey);

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase client initialized successfully.");
} else {
  console.warn("⚠️ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
  
  // Cameras
  app.get("/api/cameras", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { data, error } = await supabase.from("cameras").select("*").order("id");
    if (error) {
      console.error("Error fetching cameras:", error);
      return res.status(500).json(error);
    }
    res.json(data || []);
  });

  app.post("/api/cameras", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { name, brand } = req.body;
    const { data, error } = await supabase.from("cameras").insert([{ name, brand }]).select();
    if (error) {
      console.error("Error adding camera:", error);
      return res.status(500).json(error);
    }
    res.json(data[0]);
  });

  app.put("/api/cameras/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { name, brand } = req.body;
    const { error } = await supabase.from("cameras").update({ name, brand }).eq("id", req.params.id);
    if (error) {
      console.error("Error updating camera:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.delete("/api/cameras/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { error } = await supabase.from("cameras").delete().eq("id", req.params.id);
    if (error) {
      console.error("Error deleting camera:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  // Lenses
  app.get("/api/lenses", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { data, error } = await supabase.from("lenses").select("*").order("id");
    if (error) {
      console.error("Error fetching lenses:", error);
      return res.status(500).json(error);
    }
    res.json(data || []);
  });

  app.post("/api/lenses", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { name, brand } = req.body;
    const { data, error } = await supabase.from("lenses").insert([{ name, brand }]).select();
    if (error) {
      console.error("Error adding lens:", error);
      return res.status(500).json(error);
    }
    res.json(data[0]);
  });

  app.put("/api/lenses/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { name, brand } = req.body;
    const { error } = await supabase.from("lenses").update({ name, brand }).eq("id", req.params.id);
    if (error) {
      console.error("Error updating lens:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.delete("/api/lenses/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { error } = await supabase.from("lenses").delete().eq("id", req.params.id);
    if (error) {
      console.error("Error deleting lens:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  // Rentals
  app.get("/api/rentals", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        cameras (name),
        lenses (name)
      `)
      .order("id", { ascending: false });
    
    if (error) {
      console.error("Error fetching rentals:", error);
      return res.status(500).json(error);
    }
    
    // Transform data to match previous structure
    const transformed = (data || []).map((r: any) => ({
      ...r,
      camera_name: r.cameras?.name,
      lens_name: r.lenses?.name
    }));
    
    res.json(transformed);
  });

  app.post("/api/rentals", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { data, error } = await supabase.from("rentals").insert([req.body]).select();
    if (error) {
      console.error("Error adding rental:", error);
      return res.status(500).json(error);
    }
    res.json(data[0]);
  });

  app.put("/api/rentals/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { error } = await supabase.from("rentals").update(req.body).eq("id", req.params.id);
    if (error) {
      console.error("Error updating rental:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.delete("/api/rentals/:id", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase is not configured" });
    const { error } = await supabase.from("rentals").delete().eq("id", req.params.id);
    if (error) {
      console.error("Error deleting rental:", error);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    (async () => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    })();
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
