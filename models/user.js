const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/minproject");

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  age: Number,
  password: String,
  profilepic: {
    type: String,
    default: "default.png",
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
});

module.exports = mongoose.model("user", userSchema);
