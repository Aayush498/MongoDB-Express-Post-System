const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const post = require("./models/post");
const crypto = require("crypto");
const path = require("path");
const upload = require("./config/multerconfig");

app.use("/images", express.static(path.join(__dirname, "public/images")));

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({email: req.user.email})
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");      
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user });
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findById(req.params.id).populate("user");

  if (!post) {
    console.error("Post not found");
    return res.status(404).send("Post not found");
  }

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findById(req.params.id).populate("user");

  res.render("edit", { post });
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );

  res.redirect("/profile");
});

app.post("/post", isLoggedIn, async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      console.error("User not found");
      return res.status(500).send("User not found");
    }

    let { content } = req.body;
    if (!content) {
      console.error("Content is empty");
      return res.status(400).send("Content cannot be empty");
    }

    let post = await postModel.create({
      user: user._id,
      content,
    });

    user.posts.push(post._id);
    await user.save();

    console.log("Post created successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating post");
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.post("/register", async (req, res) => {
  let { username, email, age, name, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User already registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        name,
        username,
        email,
        age,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, "shit");
      res.cookie("token", token);
      res.send("Registered");
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("Something went wrong");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shit");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

// Route to render delete confirmation page
app.get("/post/:id/delete", isLoggedIn, async (req, res) => {
  try {
    let post = await postModel.findById(req.params.id).populate("user");

    if (!post) {
      console.error("Post not found");
      return res.status(404).send("Post not found");
    }

    res.render("delete", { post });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching post for deletion");
  }
});

// Route to handle post deletion
app.post("/post/:id/delete", isLoggedIn, async (req, res) => {
  try {
    let post = await postModel.findById(req.params.id);

    if (!post) {
      console.error("Post not found");
      return res.status(404).send("Post not found");
    }

    // Check if the logged-in user is the owner of the post
    if (post.user.toString() !== req.user.userid) {
      console.error("Unauthorized to delete this post");
      return res.status(403).send("Unauthorized to delete this post");
    }

    await postModel.findByIdAndDelete(req.params.id);
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting post");
  }
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  console.log("Token received:", token); // Debugging line

  if (!token) {
    console.log("No token provided");
    return res.redirect("/login");
  }

  try {
    const data = jwt.verify(token, "shit");
    req.user = data;
    console.log("Token verified:", data); // Debugging line
    next();
  } catch (err) {
    console.log("Invalid token:", err.message);
    return res.status(401).send("Invalid Token");
  }
}

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
