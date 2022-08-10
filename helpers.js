const getUser = function(email, db) {
  for (let u in db) {
    if (db[u].email === email) {
      return db[u];
    }
  }
  return null;
};

module.exports = {
  getUser
};