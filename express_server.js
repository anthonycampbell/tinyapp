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
  if (req.session.user_is) {
    res.redirect('/urls');
  } else {
    res.redirect("login");
  }
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/login", (req, res) =>{
  let user = userDatabase[req.session.user_id];
  if (user) {
    res.redirect('/urls');
  } else {
    const templateVars = {user : user};
    res.render('login', templateVars);
  }
});

app.post("/login", (req, res) => {
  let user = getUser(req.body.email, userDatabase);
  if (user) {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      req.session['user_id'] = user.id;
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
  req.session = null;
  res.redirect('/urls');
});

app.get("/register", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    res.redirect('/urls');
  } else {
    const templateVars = {user : user};
    res.render('register', templateVars);
  }
});

app.post("/register", (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  let user = getUser(email, userDatabase);
  if (email === "" || password === "" || user) {
    res.statusCode = 400;
    res.end();
  } else {
    userDatabase[id] = {
      id: id,
      email: email,
      password: bcrypt.hashSync(password, 10)
    };
    req.session['user_id'] = id;
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (!user) {
    res.render("not_logged_in");
  } else {
    let urls = urlsForUser(urlDatabase, req.session.user_id);
    // this is kind of ugly because I didnt want to refactor
    // my urlsForUser function just for the stretch
    let urlVisits = {};
    let urlUniqueVisits = {};
    let urlDates = {};
    for (let id in urls) {
      urlVisits[id] = urlDatabase[id].visits;
      urlUniqueVisits[id] = urlDatabase[id].uniqueVisitors;
      urlDates[id] = urlDatabase[id].createdAt;
    }
    const templateVars = {
      urls: urls,
      user : user,
      visits: urlVisits,
      uniqueVisits: urlUniqueVisits,
      urlDates: urlDates
    };
    res.render('urls_index', templateVars);
  }
});

app.post("/urls", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (!user) {
    res.render("not_logged_in");
  } else {
    let uid = req.session.user_id;
    let id = generateRandomString();
    urlDatabase[id] = {
      longURL: req.body.longURL,
      userID: uid,
      visits: 0,
      uniqueVisitors: 0,
      visitObjects: [],
      createdAt: new Date()
    };
    res.redirect(`/urls/${id}`);
  }
});

app.get("/urls/new", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (!user) {
    res.redirect('/login');
  } else {
    const templateVars = {user : user};
    res.render("urls_new", templateVars);
  }
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
      res.render("urls_show", templateVars);
    } else {
      res.render('access_denied');
    }
  } else {
    //must be logged in
    res.redirect("/login");
  }
});

app.delete("/urls/:id", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
    if (theirURLs[req.params.id]) { // they can delete if they own it
      delete urlDatabase[req.params.id];
      res.redirect("/urls");
    } else if (!urlDatabase[req.params.id]) { // it doesnt exist to be deleted
      res.render('404_not_found');
    } else {
      res.render('access_denied'); //it doesnt belong to them
    }
  } else {
    //must be logged in
    res.render("not_logged_in");
  }
});

app.put("/urls/:id", (req, res) => {
  let user = userDatabase[req.session.user_id];
  if (user) {
    let theirURLs = urlsForUser(urlDatabase, req.session.user_id);
    if (theirURLs[req.params.id]) { // they can update if they own it
      urlDatabase[req.params.id].longURL = req.body.newURL;
      res.redirect("/urls");
    } else if (!urlDatabase[req.params.id]) {  // it doesnt exist to be updated
      res.render('404_not_found');
    } else {
      res.render('access_denied'); //it doesnt belong to them
    }
  } else {
    //must be logged in
    res.render("not_logged_in");
  }
});

app.get("/u/:id", (req, res) => {
  let id = req.params.id;
  if (urlDatabase[id]) {
    let d = new Date();
    let vid;
    if (!hasVisited(urlDatabase, id, req.cookies['analytics'])) {
      if (!req.cookies['analytics']) {
        vid = generateRandomString();
        res.cookie('analytics', vid);
      }
      urlDatabase[id].uniqueVisitors = urlDatabase[id].uniqueVisitors + 1;
    }
    !vid ? vid = req.cookies['analytics'] : null;
    urlDatabase[id].visitObjects.push({
      timestamp: d,
      visitorID: vid
    });
    urlDatabase[id].visits = urlDatabase[id].visits + 1;
    res.redirect(urlDatabase[id].longURL);
  } else {
    res.render('404_not_found');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});