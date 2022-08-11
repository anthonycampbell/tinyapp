const getUser = function(email, db) {
  for (let u in db) {
    if (db[u].email === email) {
      return db[u];
    }
  }
  return null;
};

const generateRandomString = function() {
  let alphNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let result = '';
  for (let i = 0; i < 6; i++) {
    let j = Math.floor(Math.random() * (alphNum.length - 1));
    result += alphNum[j];
  }
  return result;
};

const urlsForUser = function(db, id) {
  let urls = {};
  for (let url in db) {
    if (id === db[url].userID) {
      urls[url] = db[url].longURL;
    }
  }
  return urls;
};

const hasVisited = function(db, url, vid) {
  for (let v of db[url].visitObjects) {
    if (v.visitorID === vid) {
      return true;
    }
  }
  return false;
};

module.exports = {
  getUser,
  generateRandomString,
  urlsForUser,
  hasVisited

};