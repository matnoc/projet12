import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3000;

// Middleware pour traiter les données POST
app.use(express.urlencoded({ extended: true }));

// --- Connexion à la base Heroku ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Page d'accueil ---
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// --- Page liste des contacts ---
app.get("/contacts", async (req, res) => {
  const result = await pool.query("SELECT sfid, firstname, lastname, email FROM salesforce.contact ORDER BY lastname ASC");
  let html = `<h2>Liste des contacts</h2><ul>`;
  result.rows.forEach((c) => {
    html += `<li>${c.firstname || ""} ${c.lastname || ""} 
      (<a href="/edit/${c.sfid}">Modifier</a>)</li>`;
  });
  html += `</ul>
  <p><a href="/">⬅️ Retour à l'accueil</a></p>`;
  res.send(html);
});

// --- Page de modification d’un contact ---
app.get("/edit/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const result = await pool.query("SELECT sfid, firstname, lastname, email FROM salesforce.contact WHERE sfid = $1", [sfid]);
  const c = result.rows[0];
  if (!c) return res.send("Contact non trouvé");
  res.send(`
    <h2>Modifier le contact</h2>
    <form method="POST" action="/edit/${sfid}">
      <label>Prénom :</label><input name="firstname" value="${c.firstname || ""}" /><br/>
      <label>Nom :</label><input name="lastname" value="${c.lastname || ""}" /><br/>
      <label>Email :</label><input name="email" value="${c.email || ""}" /><br/>
      <button type="submit">Enregistrer</button>
    </form>
    <p><a href="/contacts">⬅️ Retour à la liste des contacts</a></p>
  `);
});

// --- Traitement du formulaire ---
app.post("/edit/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const { firstname, lastname, email } = req.body;
  await pool.query(
    "UPDATE salesforce.contact SET firstname = $1, lastname = $2, email = $3 WHERE sfid = $4",
    [firstname, lastname, email, sfid]
  );
  res.redirect("/contacts");
});

// --- Page liste des produits ---
app.get("/produit", async (req, res) => {
  const result = await pool.query("SELECT sfid, name, family FROM salesforce.product2 ORDER BY name ASC");
  let html = `<h2>Liste des produits</h2><ul>`;
  result.rows.forEach((p) => {
    html += `<li>${p.name || "Sans nom"} — ${p.family || "Sans catégorie"}</li>`;
  });
  html += `</ul>
  <p><a href="/">⬅️ Retour à l'accueil</a></p>`;
  res.send(html);
});

// --- Page liste des contrats ---
app.get("/contract", async (req, res) => {
  const result = await pool.query("SELECT sfid, contractnumber, startdate, enddate FROM salesforce.contract ORDER BY startdate DESC");
  let html = `<h2>Liste des contrats</h2><ul>`;
  result.rows.forEach((c) => {
    html += `<li>Contrat ${c.contractnumber || ""} — du ${c.startdate || "?"} au ${c.enddate || "?"}</li>`;
  });
  html += `</ul>
  <p><a href="/">⬅️ Retour à l'accueil</a></p>`;
  res.send(html);
});

app.listen(port, () => console.log(`✅ App en ligne sur port ${port}`));