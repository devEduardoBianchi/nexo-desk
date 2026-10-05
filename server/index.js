import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createStore } from "./database.js";
import { toCsv } from "./csv.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function createApp(
  store = createStore(resolve(root, "data/nexo.sqlite")),
) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.headers.host}`
    )
      return res.status(403).json({ error: "invalidOrigin" });
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", (req, res, next) => {
    if (
      ["POST", "PATCH"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res.status(400).json({ error: "invalidRequest" });
    next();
  });
  app.param("id", (req, res, next, id) => {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1)
      return res.status(400).json({ error: "invalidRequest" });
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/meta", (_req, res) =>
    res.json({ agents: store.agents(), currentAgentId: 1, demo: true }),
  );
  app.get("/api/summary", (req, res) =>
    res.json(store.summary(req.query.days)),
  );
  app.get("/api/tickets", (req, res) =>
    res.json({ tickets: store.list(req.query) }),
  );
  app.get("/api/tickets.csv", (req, res) => {
    res.attachment(
      "nexo-desk-" + new Date().toISOString().slice(0, 10) + ".csv",
    );
    res.type("text/csv; charset=utf-8");
    res.send(toCsv(store.list(req.query), store.agents(), req.query.lang));
  });
  app.get("/api/tickets/:id", (req, res) => {
    const ticket = store.get(Number(req.params.id));
    if (!ticket) return res.status(404).json({ error: "notFound" });
    res.json({ ticket, events: store.history(ticket.id) });
  });
  app.post("/api/tickets", (req, res) =>
    res.status(201).json({ ticket: store.insert(req.body) }),
  );
  app.patch("/api/tickets/:id", (req, res) =>
    res.json(store.update(Number(req.params.id), req.body)),
  );
  app.post("/api/tickets/:id/notes", (req, res) =>
    res
      .status(201)
      .json({
        ticket: store.note(
          Number(req.params.id),
          req.body.text,
          req.body.version,
        ),
      }),
  );
  app.post("/api/bulk", (req, res) => res.json(store.bulk(req.body)));
  app.post("/api/undo", (req, res) =>
    res.json(store.undo(String(req.body.token || ""))),
  );
  // Only the required browser distributions are exposed, not all node_modules.
  for (const file of [
    "gsap.min.js",
    "Flip.min.js",
    "ScrollTrigger.min.js",
    "DrawSVGPlugin.min.js",
    "CustomEase.min.js",
  ])
    app.get("/vendor/" + file, (_req, res) =>
      res.sendFile(resolve(root, "node_modules/gsap/dist", file)),
    );
  app.use(express.static(resolve(root, "public")));
  app.use("/api", (_req, res) => res.status(404).json({ error: "notFound" }));
  app.use((err, _req, res, _next) => {
    if (!err.status) console.error(err);
    res
      .status(err.status || 500)
      .json({
        error:
          err.code ||
          (err.type === "entity.parse.failed"
            ? "invalidRequest"
            : "serverError"),
        fields: err.fields,
      });
  });
  return app;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3333);
  const server = createApp().listen(port, "127.0.0.1", () =>
    console.log(`Nexo Desk: http://127.0.0.1:${port}`),
  );
  server.on("error", (e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
