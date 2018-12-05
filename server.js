const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

const userSchema = new Schema({
  username: {
    type: String,
    unique: true
  },
  exercises: [exerciseSchema]
});

const User = mongoose.model("exerciseuser", userSchema);
const Exercise = mongoose.model("exercise", exerciseSchema);

mongoose.connect(
  process.env.MONGO_URI,
  () => console.log("connected")
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", async (req, res) => {
  //story1
  const user = await User.findOne({
    username: req.body.username
  });
  if (user) return res.json({ error: "user already exists" });
  else {
    const user = new User({
      username: req.body.username
    });
    user.save().then(doc =>
      res.json({
        username: doc.username,
        userId: doc._id
      })
    );
  }
});

app.get("/api/exercise/users", async (req, res) => {
  //story2
  const users = await User.find({});
  res.json(users);
});

app.post("/api/exercise/add", async (req, res) => {
  //story3
  let date = new Date();
  if (req.body.date) {
    date = new Date(req.body.date);
  }
  console.log(new Date(req.body.date));
  const exercise = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date
  });

  User.findByIdAndUpdate(req.body.userId, { $push: { exercises: exercise } }, { new: true }).then(
    doc => res.json(doc)
  );
});

app.get("/api/exercise/log", async (req, res) => {
  //story4 & 5
  let user = await User.findById(req.query.userId);
  user = user.toObject();
  let list = user.exercises;
  if (req.query.from) {
    list = user.exercises.filter(exercise => exercise.date > new Date(req.query.from));
  }
  if (req.query.to) {
    list = user.exercises.filter(exercise => exercise.date < new Date(req.query.to));
  }
  if (req.query.limit) {
    list = list.slice(0, req.query.limit);
  }
  res.json({
    ...user,
    exercises: list,
    count: list.length
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;
  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
