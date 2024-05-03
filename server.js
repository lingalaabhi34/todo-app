const e = require("express");
const express = require("express");
const userModel = require("./models/userModel");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbsession = require("connect-mongodb-session")(session);
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");

const {
  userdatavaliadations,
  isEmailRegex,
} = require("./utils/userdatavalidation");
const { isAuth } = require("./middlewares/isAuth");
const { tododatavalidation } = require("./utils/tododatavalidations");
const todomodel = require("./models/todomodel");
const ratelimiting = require("./middlewares/ratelimiting");
const { generatetoken, verifyemail } = require("./utils/emailvalidations");

const url = process.env.URL;
const store = mongodbsession({
  uri: process.env.URL,
  collection: "Sessions",
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.secret,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);
mongoose
  .connect(url)
  .then(() => console.log("mongoose connected successfully"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  return res.send("server connected successfully");
});
app.get("/register", (req, res) => {
  return res.render("registerPage");
});
app.post("/register-user", async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    userdatavaliadations({ name, username, email, password });
  } catch (error) {
    console.log(error);
    return res.send({
      status: 400,
      error: error,
    });
  }
  try {
    const isemail = await userModel.findOne({ email });
    if (isemail) {
      return res.send({ status: 400, message: "email already exists" });
    }
    const usernameexist = await userModel.findOne({ username });
    if (usernameexist) {
      return res.send({ status: 400, message: "username already exists" });
    }
    const hashedpassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );

    const userobj = new userModel({
      name: name,
      username: username,
      email: email,
      password: hashedpassword,
    });

    const userDb = await userobj.save();
    // console.log(userDb);
    // return res.send({
    //   status: 201,
    //   message: "data collected from user",
    //   data: hashedpassword,
    // });

    // generate a token
    const verifiedtoken = generatetoken(email);
    verifyemail({ email, verifiedtoken });

    return res.redirect("login");
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});
app.get("/verifytoken/:token", (req, res) => {
  const token = req.params.token;
  jwt.verify(token, process.env.SECRET_KEY, async (err, userInfo) => {
    try {
      await userModel.findOneAndUpdate(
        { email: userInfo },
        { isEmailVerified: true }
      );

      return res.redirect("/login");
    } catch (error) {
      return res.status(500).json("Internal server error");
    }
  });
});
app.get("/login", (req, res) => {
  return res.render("loginpage");
});
app.post("/login-user", async (req, res) => {
  const { loginId, password } = req.body;

  let userDb;
  try {
    if (isEmailRegex({ str: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }
    if (!userDb) {
      return res.send({
        status: 400,
        message: "User not found, please register first",
      });
    }
    const isMatched = await bcrypt.compare(password, userDb.password);
    if (!isMatched) {
      return res.send({
        status: 400,
        message: "Password is incorrect",
      });
    }
    //   console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      username: userDb.username,
      email: userDb.email,
      userId: userDb._id,
    };
    return res.redirect("/dashboard");
    // return res.send({status:201,message:"success"})
  } catch (error) {
    console.log(error);

    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});
app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboard");
});
app.post("/logout", (req, res) => {
  console.log(req.session);
  req.session.destroy((err) => {
    if (err) throw err;
    console.log(req.session);
    return res.redirect("/login");
  });
});
app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const sessionSchema = new Schema({ _id: String }, { strict: false });
  const sessionmodel = mongoose.model("session", sessionSchema);
  try {
    const deleteDb = await sessionmodel.deleteMany({
      "session.user.username": username,
    });
    return res.send({
      status: 200,
      message: "Logout from all devices successfull",
      data: deleteDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      error: error,
    });
  }
});
app.post("/create-item", isAuth, ratelimiting, async (req, res) => {
  const todotext = req.body.todo;
  const username = req.session.user.username;
  try {
    await tododatavalidation({ todotext });
  } catch (error) {
    console.log(error);
    return res.send({
      status: 400,
      message: "Data error",
      error: error,
    });
  }
  const todoobj = new todomodel({
    todo: todotext,
    username: username,
  });
  try {
    // const todoDb = await todoobj.save();
    const todoDb = await todomodel.create({
      todo: todotext,
      username: username,
    });
    return res.send({
      status: 201,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});
app.get("/read-item", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const LIMIT = 3;
  const SKIP = Number(req.query.skip);
  try {
    const todoDb = await todomodel.aggregate([
      {
        $match: { username: username },
      },
      {
        $skip: SKIP,
      },
      {
        $limit: LIMIT,
      },
    ]);

    // const todoDb = await todomodel.find({ username });
    if (todoDb.length === 0) {
      return res.send({ status: 204, message: "No Todo's found" });
    }
    return res.send({
      status: 200,
      message: "Read success",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
  return res.send({ status: 201, message: "read item succesfully" });
});
app.post("/edit-item", isAuth, async (req, res) => {
  const { todoId, newData } = req.body;
  const username = req.session.user.username;
  if (!todoId) {
    return res.send({ status: 400, message: "Missing todoId" });
  }
  try {
    await tododatavalidation({ todotext: newData });
  } catch (error) {
    return res.send({
      status: 400,
      error: error,
    });
  }
  try {
    const todoDb = await todomodel.findOne({ _id: todoId });

    if (!todoDb) {
      return res.send({
        status: 203,
        message: `No todo found with todoId : ${todoId}`,
      });
    }

    //compare the ownership
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not allowed to edit the todo",
      });
    }

    const prevtodo = await todomodel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData }
    );

    return res.send({
      status: 200,
      message: "Todo updated successfully",
      data: prevtodo,
    });
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});
app.delete("/delete-item", isAuth, async (req, res) => {
  const { todoId } = req.body;
  const username = req.session.user.username;

  if (!todoId) {
    return res.send({
      status: 400,
      message: "Missing todoId",
    });
  }

  //find the todo
  try {
    const todoDb = await todomodel.findOne({ _id: todoId });

    if (!todoDb) {
      return res.send({
        status: 203,
        message: `No todo found with todoId : ${todoId}`,
      });
    }

    //compare the ownership
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not allowed to delete the todo",
      });
    }

    const deletedTodo = await todomodel.findOneAndDelete({ _id: todoId });

    // const todoDbupdate = await todoModel.updateOne(
    //   { _id: todoId },
    //   { todo: newData }
    // );

    return res.send({
      status: 200,
      message: "Todo deleted successfully",
      data: deletedTodo,
    });
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});
app.listen(8000, () => {
  console.log("server started sucessfully");
});
