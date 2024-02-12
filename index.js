import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "2810",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Ariel", color: "teal" }
];

async function getCurrentUser(){
  const result = await db.query("SELECT * FROM USERS");
  users =  result.rows;
  for(let i = 0;i< users.length;i++){
     if( users[i].id == currentUserId){
        return users[i];
     }
  }
}
async function verifVisitados() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await verifVisitados();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {countries: countries,total: countries.length, users: users, color:currentUser.color});
});

app.post("/add", async (req, res) => {
  const paisSelecc = req.body["country"];
  const currentUser = await getCurrentUser();

    // Realiza una consulta para obtener el código del país
    const consultarCodigoPais = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE LOWER($1)",
      [`%${paisSelecc}%`]
    );

    if (consultarCodigoPais.rows.length !== 0) {
      // Si el país existe en la tabla countries, obtén su código
      const data = consultarCodigoPais.rows[0]; //Es cero por que verifica siempre de a 1 en 1
      const countryCode = data.country_code;

      // Verifica si el país ya ha sido visitado
      const controlarVisita = await db.query(
        "SELECT country_code FROM visited_countries WHERE country_code = $1 AND user_id = $2", 
        [countryCode,currentUser.id]
      );

      if (controlarVisita.rows.length === 0) {
        // El país no ha sido visitado, así que lo agregamos a la tabla y redirigimos
        await db.query("INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)", [
          countryCode,currentUser.id
        ]);
        res.redirect("/");
      } else {
        // El país ya ha sido visitado
        const countries = await verifVisitados();

        res.render("index.ejs", { countries:countries , total: countries.length, users:users,color:currentUser.color ,error: "The country has already been visited,try again" });
      }
    } else {
      // El país no existe en la tabla countries
      const countries = await verifVisitados();
    
      res.render("index.ejs", { countries:countries , total: countries.length,users:users,color:currentUser.color ,error: "The country doesnt exist,have spaces or isnt it English,try again" });
    }

});
app.post("/user", async (req, res) => {
   if(req.body.add == "new"){  //miremos la parte de index.ejs, name = add y value = new, si nosotros clickamos
     res.render("new.ejs");   //en el boton de add family member se activa este if por que se cumple que  name="add" === value="new" nos dirige al new.ejs
   }
   else{
     currentUserId = req.body.user; // en el caso de que despues de crear un usuario nuevo,queramos cambiar de usuarios, al clickar sobre
     res.redirect("/");             // un usuario el currentUserId va a modificarse al de ese usuario, o sino no va a cambiar de usuario
   }                               // y va a quedarse dentro del mismo usuario creado por ultimo
});

app.post("/new", async (req, res) => {
   const name = req.body.name;
   const color = req.body.color;

   const newUser = await db.query("INSERT INTO users (name,color) VALUES ($1,$2) RETURNING *;"
   ,[name,color]);

   const id = newUser.rows[0].id;
   currentUserId = id;
   res.redirect("/");

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

//IMPLEMENTAR UNA FORMA DE ELIMINAR UN PAIS DEL MAPA CON DELETE FROM TABLE en POSTGRESQL