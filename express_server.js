const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
const { response } = require("express");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "wa90cj"
  },
  "9sm5xK": {
    longURL: "http://www.google.com", 
    userID: "A9nNh2"
  }
};

const userDatabase = {
  "wa90cj": {
    id: "wa90cj",
    email: "a@a.com",
    password: "pass"
  },
  "A9nNh2": {
    id: "A9nNh2",
    email: "email@com.com",
    password: "grape"
  }
};

const generateRandomString = function() {
  let alphNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let result = '';
  for (let i = 0; i < 6; i++){
    let j = Math.floor(Math.random()*(alphNum.length-1));
    result += alphNum[j];
  }
  return result;
}

const urlsForUser = function(id) {
  let urls = {}
  for (let url in urlDatabase){
    if (id === urlDatabase[url].userID){
      urls[url] = urlDatabase[url].longURL;
    }
  }
  return urls;
}
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

app.get("/login", (req, res) =>{
  const templateVars = {user : userDatabase[req.cookies['user_id']]}
  if (req.cookies['user_id']){
    res.redirect('/urls');
  } else {
    res.render('login', templateVars);
  }
});

app.post("/login", (req, res) => {
  let user = getUser(req.body.email);
  if (user) {
    if (user.password === req.body.password){
      res.cookie('user_id', user.id);
      res.redirect('/urls');
    } else {
      res.statusCode = 403;
      res.end();
    }
  } else {
    res.statusCode = 403;
    res.end();
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.get("/register", (req, res) => {
  const templateVars = {user : userDatabase[req.cookies['user_id']]}
  if (req.cookies['user_id']){
    res.redirect('/urls');
  } else {
    res.render('register', templateVars);
  }
});

app.post("/register", (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  let user = getUser(email);
  if (email === "" || password === "" || user){
    res.statusCode = 400;
    res.end();
  } else {
    userDatabase[id] = {
      id, 
      email, 
      password
    }
    res.cookie('user_id', id);
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  if (!req.cookies['user_id']){
    res.redirect("login");
  } else {
    const templateVars = { 
      urls: urlsForUser(req.cookies['user_id']),
      user : userDatabase[req.cookies['user_id']]
    };
    res.render('urls_index', templateVars);
  }
});

app.post("/urls", (req, res) => {
  if (!req.cookies['user_id']){
    res.render("not_logged_in");
  } else {
    let uid = req.cookies['user_id'];
    let id = generateRandomString();
    urlDatabase[id] = {
      longURL: req.body.longURL,
      userID: uid
    };
    res.redirect(`/urls/${id}`);
  }
});

app.get("/urls/new", (req, res) => {
  const templateVars = {user : userDatabase[req.cookies['user_id']]}
  if (!req.cookies['user_id']){
    res.redirect('/login');
  } else {
    res.render("urls_new", templateVars);
  }
});

app.get("/urls/:id", (req, res) => {
  if (req.cookies['user_id']){
    let theirURLs = urlsForUser(req.cookies['user_id']);
    if (theirURLs[req.params.id]){
      const templateVars = { 
        id: req.params.id,
        longURL: urlDatabase[req.params.id].longURL,
        user : userDatabase[req.cookies['user_id']]
      };
      res.render("urls_show", templateVars);
    } else {
      res.render('access_denied');
    }
  } else {
    //must be logged in
    res.redirect("/login");
  }
});

app.post("/urls/:id/delete", (req, res) => {
  if (req.cookies['user_id']){
    let theirURLs = urlsForUser(req.cookies['user_id']);
    if (theirURLs[req.params.id]){
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
    } else if (!urlDatabase[req.params.id]){
      res.render('404_not_found');
    } else {
      res.render('access_denied');
    }
  } else {
    //must be logged in
    res.render("not_logged_in");
  }
});

app.post("/urls/:id", (req, res) => {
  if (req.cookies['user_id']){
    let theirURLs = urlsForUser(req.cookies['user_id']);
    if (theirURLs[req.params.id]){
      urlDatabase[req.params.id].longURL= req.body.newURL;
      res.redirect("/urls");
    } else if (!urlDatabase[req.params.id]){
      res.render('404_not_found');
    } else {
      res.render('access_denied');
    }
  } else {
    //must be logged in
    res.render("not_logged_in");
  }
});

app.get("/u/:id", (req, res) => {
  if (urlDatabase[req.params.id]){
    res.redirect(urlDatabase[req.params.id]);
  } else {
    res.render('404_not_found');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});