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

// --- Page info du contact ---
app.get("/profile/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const result = await pool.query("SELECT sfid, herokuexternalid__c, firstname, lastname, email, password__c, phone  FROM salesforce.contact WHERE sfid =$1", [sfid]);
  const c = result.rows[0];
  if (!c) return res.send("Contact non trouvé");
  res.send(`
    <h2>Information personnelle : </h2>
    <p>Prenom : ${c.firstname || ""} <br/>
    Nom : ${c.lastname || ""}<br/>
    username : ${c.herokuexternalid__c || ""}<br/>
    Email : ${c.email || ""}<br/>
    Telephone : ${c.phone || ""}<br/>
    (<a href="/edit/${c.sfid}">Modifier</a>)</p>
    <div>
    <button onclick="location.href='/produit/${c.sfid}'">Produits</button>
    <button onclick="location.href='/contract/${c.sfid}'">Contract</button>
    </div>
    <p><a href="/">⬅️ Retour à l'accueil</a></p>
    `);
});

// --- Page de modification d’un contact ---
app.get("/edit/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const { error } = req.query; // Permet d'afficher un message d'erreur
  const result = await pool.query("SELECT sfid, herokuexternalid__c, firstname, lastname, email, password__c, phone  FROM salesforce.contact WHERE sfid =$1", [sfid]);
  const c = result.rows[0];
  if (!c) return res.send("Contact non trouvé");
  res.send(`
    ${error ? `<p style="color:red;">${error}</p>` : ""}
    <h2>Modifier le contact</h2>
    <form method="POST" action="/edit/${sfid}">
      <label>Prénom :</label><input name="firstname" value="${c.firstname || ""}" /><br/>
      <label>Nom :</label><input name="lastname" value="${c.lastname || ""}" /><br/>
      <label>Nom :</label><input name="herokuexternalid__c" value="${c.herokuexternalid__c || ""}" /><br/>
      <label>Nom :</label><input name="password__c" value="${c.password__c || ""}" /><br/>
      <label>Nom :</label><input name="phone" value="${c.phone || ""}" /><br/>
      <label>Email :</label><input name="email" value="${c.email || ""}" /><br/>
      <button type="submit">Enregistrer</button>
    </form>
    <p><a href="/profile/${c.sfid}">⬅️ Annulez les modifications</a></p>
  `);
});

// --- Traitement du formulaire contact ---
app.post("/edit/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const { firstname, lastname, email, phone, password__c, herokuexternalid__c } = req.body;
  const result = await pool.query("SELECT sfid, herokuexternalid__c, firstname, lastname, email, password__c, phone  FROM salesforce.contact WHERE sfid =$1", [sfid]);
  const c = result.rows[0];

  try {
    // Vérifier email
    const emailCheck = await pool.query(
      "SELECT id FROM salesforce.contact WHERE email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0 && email != c.email) {
      return res.redirect("/edit/"+c.sfid+"?error=" + encodeURIComponent("Nouvel email déjà utilisé"));
    }

    // Vérifier username/herokuexternalid__c
    const sfidCheck = await pool.query(
      "SELECT id FROM salesforce.contact WHERE herokuexternalid__c = $1",
      [herokuexternalid__c]
    );

    if (sfidCheck.rows.length > 0 && herokuexternalid__c != c.herokuexternalid__c) {
      return res.redirect("/edit/"+c.sfid+"?error=" + encodeURIComponent("Nouveau nom d'utilisateur déjà utilisé"));
    }

  } catch (error) {
    console.error(error);
    return res.redirect("/edit/"+c.sfid+"?error=" + encodeURIComponent("Erreur serveur"));
  }
  
  await pool.query(
    "UPDATE salesforce.contact SET firstname = $1, lastname = $2, email = $3, herokuexternalid__c = $4, phone = $5, password__c = $6 WHERE sfid = $7",
    [firstname, lastname, email, herokuexternalid__c, phone, password__c, sfid]
  );
  res.redirect("/profile/"+sfid);
});

// --- Page liste des produits ---
app.get("/produit/:sfid", async (req, res) => {
  const { sfid } = req.params;
  const result = await pool.query("SELECT sfid, name, family FROM salesforce.product2 ORDER BY name ASC");
  let html = `<h2>Liste des produits</h2><ul>`;
  result.rows.forEach((p) => {
    html += `<li>${p.name || "Sans nom"} — ${p.family || "Sans catégorie"}</li>`;
  });
  html += `</ul>
  <p><a href="/profile/${sfid}">⬅️ Retour au profile</a></p>`;
  res.send(html);
});

// --- Page liste des contrats ---
app.get("/contract/:sfid", async (req, res) => {
   const { sfid } = req.params;
  const result = await pool.query("SELECT contractnumber, startdate, enddate FROM salesforce.contract WHERE CustomerSignedId = $1",[sfid]);
  let html = `<h2>Liste des contrats</h2><ul>`;
  result.rows.forEach((c) => {
    html += `<li>Contrat ${c.contractnumber || ""} — du ${c.startdate || "?"} au ${c.enddate || "?"}</li>`;
  });
  html += `</ul>
  <p><a href="/profile/${sfid}">⬅️ Retour au profile</a></p>`;
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

      <label>Nom d'utilisateur (herokuexternalid__c) :</label>
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

    // Vérifier username/herokuexternalid__c
    const sfidCheck = await pool.query(
      "SELECT id FROM salesforce.contact WHERE herokuexternalid__c = $1",
      [username]
    );

    if (sfidCheck.rows.length > 0) {
      return res.redirect("/register?error=" + encodeURIComponent("Nom d'utilisateur déjà utilisé"));
    }

    // Insertion
    await pool.query(
      `INSERT INTO salesforce.contact (firstname, lastname, email, sfid, password__c)
       VALUES ($1, $2, $3, $4, $5)`,
      [firstname, lastname, email, username, password]
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
        <label>Nom d'utilisateur (herokuexternalid__c) :</label>
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
      "SELECT sfid, password__c, herokuexternalid__c FROM salesforce.contact WHERE herokuexternalid__c = $1 AND password__c = $2",
      [username, password]
    );

    // Aucun utilisateur trouvé
    if (result.length == 0) {
      error = "Identifiants incorrects";
    } else {
        // Connexion OK
        const c = result.rows[0];
        return res.redirect(`/profile/${c.sfid}`);
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