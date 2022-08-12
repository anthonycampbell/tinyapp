const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const getUser = require('./helpers').getUser;
const generateRandomString = require('./helpers').generateRandomString;
const urlsForUser = require('./helpers').urlsForUser;
const hasVisited = require('./helpers').hasVisited;
const methodOverride = require('method-override');
const urlDatabase = require('./databases/urlDatabase');
const userDatabase = require('./databases/userDatabase');

app.use(methodOverride('_method'));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['ALFBELIBVALalisnfacl'],
}));
app.use(cookieParser());

app.get("/", (req, res) => {
  if (req.session.user_id) {
    return res.redirect('/urls');
  }
  return res.redirect("login");
});

app.get("/hello", (req, res) => {
  return res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  return res.json(urlDatabase);
});

app.get("/login", (req, res) =>{
  let user = userDatabase[req.session.user_id];
  const templateVars = {user : user};
  if (user) {
    return res.redirect('/urls');
  }
  return res.render('login', templateVars);
});

app.post("/login", (req, res) => {
  let user = getUser(req.body.email, userDatabase);
  if (user) {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      req.session['user_id'] = user.id;
      return res.redirect('/urls');
    }
    res.statusCode = 403; //wrong password
    return res.end();
  }
  res.statusCode = 403; //user doesnt exist
  return res.end();
});

app.post("/logout", (req, res) => {
  req.session = null;
  return res.redirect('/urls');
});

app.get("/register", (req, res) => {
  let user = userDatabase[req.session.user_id];
  const templateVars = {user : user};
  if (user) {
    return res.redirect('/urls');
  }
  return res.render('register', templateVars);
});

app.post("/register", (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  let newUser = {
    id: id,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  let user = getUser(email, userDatabase);
  if (email === "" || password === "" || user) { // oops bad user submission
    res.statusCode = 400;
    return res.end();
  }
  userDatabase[id] = newUser;
  req.session['user_id'] = id;
  return res.redirect('/urls');
});

app.get("/urls", (req, res) => {
  let user = userDatabase[req.session.user_id];
  let urls = urlsForUser(urlDatabase, req.session.user_id);
  const templateVars = {
    urls: urls,
    user : user,
    urlData: urlDatabase
  };
  if (!user) {
    return res.render("not_logged_in");
  }
  return res.render('urls_index', templateVars);
});

app.post("/urls", (req, res) => {
  let user = userDatabase[req.session.user_id];
  let uid = req.session.user_id;
  let id = generateRandomString();
  let newURL = {
    longURL: req.body.longURL,
    userID: uid,
    visits: 0,
    uniqueVisitors: 0,
    visitObjects: [],
    createdAt: new Date()
  };
  if (!user) {
    return res.render("not_logged_in");
  }
  urlDatabase[id] = newURL;
  return res.redirect(`/urls/${id}`);
});

app.get("/urls/new", (req, res) => {
  let user = userDatabase[req.session.user_id];
  const templateVars = {user : user};
  if (!user) {
    return res.redirect('/login');
  }
  return res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
    if (theirURLs[req.params.id]) {
      const templateVars = {
        id: req.params.id,
        urlData: urlDatabase[req.params.id],
        user : user
      };
      return res.render("urls_show", templateVars);
    } 
    return res.render('access_denied'); //Doesnt belong to you bro
  }
  return res.redirect("/login");
});

app.delete("/urls/:id", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
    if (theirURLs[req.params.id]) { // they can delete if they own it
      delete urlDatabase[req.params.id];
      return res.redirect("/urls");
    }
    if (!urlDatabase[req.params.id]) { // it doesnt exist to be deleted
      return res.render('404_not_found');
    }
    return res.render('access_denied'); //it doesnt belong to them
  }
  return res.render("not_logged_in");
});

app.put("/urls/:id", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
    if (theirURLs[req.params.id]) { // they can update if they own it
      urlDatabase[req.params.id].longURL = req.body.newURL;
      return res.redirect("/urls");
    }
    if (!urlDatabase[req.params.id]) {  // it doesnt exist to be updated
      return res.render('404_not_found');
    }
    return res.render('access_denied'); //it doesnt belong to them
  } 
  return res.render("not_logged_in");
});

app.get("/u/:id", (req, res) => {
  let id = req.params.id;
  if (urlDatabase[id]) {
    let d = new Date();
    let vid;
    if (!hasVisited(urlDatabase, id, req.cookies['analytics'])) { // remember first visit
      if (!req.cookies['analytics']) {
        vid = generateRandomString();
        res.cookie('analytics', vid);
      }
      urlDatabase[id].uniqueVisitors = urlDatabase[id].uniqueVisitors + 1;
    }
    !vid ? vid = req.cookies['analytics'] : null; // subsequent visits
    urlDatabase[id].visitObjects.push({
      timestamp: d,
      visitorID: vid
    });
    urlDatabase[id].visits = urlDatabase[id].visits + 1;
    return res.redirect(urlDatabase[id].longURL);
  }
  return res.render('404_not_found');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});