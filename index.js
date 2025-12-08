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
app.get("/profile/:sfid", async (req, res) => {
  const result = await pool.query("SELECT sfid, firstname, lastname, email, password__c, AssistantPhone, Birthdate, AccountId, MailingAddress, Title  FROM salesforce.contact WHERE sfid =$1", [sfid]);
  let html = `<h2>Liste des contacts</h2><ul>`;

    html += `<li>${c.firstname || ""} ${c.lastname || ""} 
      (<a href="/edit/${c.sfid}">Modifier</a>)</li>`;

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

// --- Traitement du formulaire contact ---
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





//--- Page d'inscription ---
app.get("/register", (req, res) => {
  const { error } = req.query; // Permet d'afficher un message d'erreur

  res.send(`
    <h2>Créer un compte</h2>

    ${error ? `<p style="color:red;">${error}</p>` : ""}

    <form method="POST" action="/register">
      <label>Prénom :</label>
      <input name="firstname" required /><br/>

      <label>Nom :</label>
      <input name="lastname" required /><br/>

      <label>Email :</label>
      <input name="email" type="email" required /><br/>

      <label>Nom d'utilisateur (HerokuExternalID__c) :</label>
      <input name="username" required /><br/>

      <label>Mot de passe :</label>
      <input name="password" type="password" required /><br/>

      <button type="submit">S'inscrire</button>
    </form>

    <p><a href="/login">⬅️ Déjà un compte ? Connexion</a></p>
  `);
});

// --- Traitement du formulaire d'inscription ---
app.post("/register", async (req, res) => {
  const { firstname, lastname, email, username, password } = req.body;

  try {
    // Vérifier email
    const emailCheck = await pool.query(
      "SELECT id FROM salesforce.contact WHERE email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.redirect("/register?error=" + encodeURIComponent("Email déjà utilisé"));
    }

    // Vérifier username/HerokuExternalID__c
    const sfidCheck = await pool.query(
      "SELECT id FROM salesforce.contact WHERE HerokuExternalID__c = $1",
      [username]
    );

    if (sfidCheck.rows.length > 0) {
      return res.redirect("/register?error=" + encodeURIComponent("Nom d'utilisateur déjà utilisé"));
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion
    await pool.query(
      `INSERT INTO salesforce.contact (firstname, lastname, email, sfid, password__c)
       VALUES ($1, $2, $3, $4, $5)`,
      [firstname, lastname, email, username, hashedPassword]
    );

    return res.redirect("/login");

  } catch (error) {
    console.error(error);
    return res.redirect("/register?error=" + encodeURIComponent("Erreur serveur"));
  }
});

// --- Page de connexion ---
app.get("/login", async (req, res) => {
  const { username, password } = req.query;
  let error = null;

  // Si aucun paramètre : afficher juste le formulaire
  if (!username || !password) {
    return res.send(`
      <h2>Connexion</h2>

      ${error ? `<p style="color:red;">${error}</p>` : ""}

      <form method="GET" action="/login">
        <label>Nom d'utilisateur (SFID) :</label>
        <input name="username" required /><br/>

        <label>Mot de passe :</label>
        <input name="password" type="password" required /><br/>

        <button type="submit">Se connecter</button>
      </form>

      <p><a href="/register">⬅️ Créer un compte</a></p>
    `);
  }

  // Sinon → vérifier les identifiants
  try {
    const result = await pool.query(
      "SELECT sfid, password__c, HerokuExternalID__c FROM salesforce.contact WHERE HerokuExternalID__c = $1 AND password__c = $2",
      [username, password]
    );

    // Aucun utilisateur trouvé
    if (result.rows.length == 0) {
      error = "Identifiants incorrects";
    } else {
        // Connexion OK
        return res.redirect(`/profile/${user.sfid}`);
      }
    

    // Afficher le formulaire avec erreur
    return res.send(`
      <h2>Connexion</h2>

      <p style="color:red;">${error}</p>

      <form method="GET" action="/login">
        <label>Nom d'utilisateur (SFID) :</label>
        <input name="username" value="${username}" required /><br/>

        <label>Mot de passe :</label>
        <input name="password" type="password" required /><br/>

        <button type="submit">Se connecter</button>
      </form>

      <p><a href="/register">⬅️ Créer un compte</a></p>
    `);

  } catch (err) {
    console.error(err);
    return res.send(`<p style="color:red;">Erreur serveur</p>`);
  }
});