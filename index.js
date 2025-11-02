import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Application Heroku + PostgreSQL ✅');
});

// Connexion à la base Heroku
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

//app.use(bodyParser.urlencoded({ extended: true }));

// --- Page liste des contacts ---
app.get("/contacts", async (req, res) => {
  const result = await pool.query("SELECT sfid, firstname, lastname, email FROM salesforce.contact ORDER BY lastname ASC LIMIT 20");
  let html = `<h2>Liste des contact</h2><ul>`;
  result.rows.forEach((c) => {
    html += `<li>${c.firstname || ""} ${c.lastname || ""} 
      (<a href="/edit/${c.sfid}">Modifier</a>)</li>`;
  });
  html += `</ul>`;
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
    <p><a href="/contact">Retour</a></p>
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

app.listen(port, () => console.log(`✅ App en ligne sur port ${port}`));
