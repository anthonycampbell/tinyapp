const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
const { response } = require("express");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function generateRandomString() {
  let alphNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let result = '';
  for (let i = 0; i < 6; i++){
    let j = Math.floor(Math.random()*(alphNum.length-1));
    result += alphNum[j];
  }
  return result;
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const userDatabase = {

};


function getUser (email){
  for (let u in userDatabase){
    if (userDatabase[u].email === email ){
      return userDatabase[u];
    }
  }
  return null;
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.post("/login", (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

app.get("/register", (req, res) => {
  const templateVars = {user : userDatabase[req.cookies['user_id']]}
  res.render('register', templateVars)
});

app.post("/register", (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  let user = getUser(email);
  console.log(userDatabase, email, password);
  if (email === "" || password === "" || user){
    console.log('here');
    res.statusCode = 400;
    res.redirect('/urls');
  } else {
    userDatabase[id] = {
      id, 
      email, 
      password
    }
    console.log('and here;');
    res.cookie('user_id', id);
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {

  const templateVars = { 
    urls: urlDatabase,
    user : userDatabase[req.cookies['user_id']]
  };
  res.render('urls_index', templateVars);
});

app.post("/urls", (req, res) => {
  let id = generateRandomString()
  urlDatabase[id] = req.body.longURL;
  res.redirect(`/urls/${id}`);
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user : userDatabase[req.cookies['user_id']] };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = { 
    id: req.params.id,
    longURL: urlDatabase[req.params.id],
    user : userDatabase[req.cookies['user_id']]
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.newURL;
  res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  res.redirect(urlDatabase[req.params.id]);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});