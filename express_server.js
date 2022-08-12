const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const {getUser, generateRandomString, urlsForUser, hasVisited} = require('./helpers');
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
  const user = userDatabase[req.session.user_id];
  if (user) {
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
  const user = userDatabase[req.session.user_id];
  if (user) {
    return res.redirect('/urls');
  }
  const templateVars = {user : user};
  return res.render('login', templateVars);
});

app.post("/login", (req, res) => {
  const user = getUser(req.body.email, userDatabase);
  if (!user) {
    return res.status(403).end(); // user doesnt exist
  }
  const correctPass = bcrypt.compareSync(req.body.password, user.password);
  if (!correctPass) {
    return res.status(403).end();
  }
  req.session['user_id'] = user.id;
  return res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  req.session = null;
  return res.redirect('/urls');
});

app.get("/register", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (user) {
    return res.redirect('/urls');
  }
  const templateVars = {user : user};
  return res.render('register', templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const user = getUser(email, userDatabase);
  if (email === "" || password === "" || user) {
    return res.status(400).end();
  }
  const newUser = {
    id: id,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  userDatabase[id] = newUser;
  req.session['user_id'] = id;
  return res.redirect('/urls');
});

app.get("/urls", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.status(400).render("not_logged_in");
  }
  const urls = urlsForUser(urlDatabase, req.session.user_id);
  const templateVars = {
    urls: urls,
    user : user,
    urlData: urlDatabase
  };
  return res.render('urls_index', templateVars);
});

app.post("/urls", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.render("not_logged_in");
  }
  const uid = req.session.user_id;
  const id = generateRandomString();
  const newURL = {
    longURL: req.body.longURL,
    userID: uid,
    totalVisits: 0,
    uniqueVisitors: 0,
    visitObjects: [],
    createdAt: new Date()
  };
  urlDatabase[id] = newURL;
  return res.redirect(`/urls/${id}`);
});

app.get("/urls/new", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.redirect('/login');
  }
  const templateVars = {user : user};
  return res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.redirect("/login");
  }
  if (!urlDatabase[req.params.id]) { // Doesn't exist
    return res.render('404_not_found');
  }
  const theirURLs = urlsForUser(urlDatabase, req.session.user_id);
  if (!theirURLs[req.params.id]) { // Doesn't belong to you bro
    return res.render('access_denied');
  }
  const templateVars = {
    id: req.params.id,
    urlData: urlDatabase[req.params.id],
    user : user
  };
  return res.render("urls_show", templateVars);
});

app.delete("/urls/:id", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.render("not_logged_in");
  }
  if (!urlDatabase[req.params.id]) { // It doesn't exist to be deleted
    return res.render('404_not_found');
  }
  let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
  if (!theirURLs[req.params.id]) { // It doesn't belong to them
    return res.render('access_denied');
  }
  delete urlDatabase[req.params.id]; //go ahead
  return res.redirect("/urls");
});

app.put("/urls/:id", (req, res) => {
  const user = userDatabase[req.session.user_id];
  if (!user) {
    return res.render("not_logged_in");
  }
  if (!urlDatabase[req.params.id]) {  // it doesnt exist to be updated
    return res.render('404_not_found');
  }
  let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
  if (!theirURLs[req.params.id]) {
    return res.render('access_denied'); //it doesnt belong to them
  }
  urlDatabase[req.params.id].longURL = req.body.newURL; // go ahead
  return res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  if (!urlDatabase[id]) {
    return res.render('404_not_found');
  }
  let visit = {
    timestamp: new Date(),
    visitorID: req.cookies['analytics']
  };
  if (!req.cookies['analytics']) {
    visit.visitorID = generateRandomString();
    res.cookie('analytics', visit.visitorID);
  }
  const hasNotVisited = !hasVisited(urlDatabase, id, req.cookies['analytics']);
  if (hasNotVisited) {
    urlDatabase[id].uniqueVisitors = urlDatabase[id].uniqueVisitors + 1;
  }
  urlDatabase[id].visitObjects.push(visit);
  urlDatabase[id].totalVisits = urlDatabase[id].totalVisits + 1;
  return res.redirect(urlDatabase[id].longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});