const bcrypt = require("bcryptjs");
const userDatabase = {
  "wa90cj": {
    id: "wa90cj",
    email: "a@a.com",
    password: bcrypt.hashSync("pass", 10)
  },
  "A9nNh2": {
    id: "A9nNh2",
    email: "email@com.com",
    password: bcrypt.hashSync("grape", 10)
  }
};

module.exports = userDatabase;