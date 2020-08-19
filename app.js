// jshint esversion: 6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.set("view engine", "ejs");
app.use(express.static('public'));     /* app.set("views",path.resolve(__dirname, "views")); app.use(express.static("public")); */
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
secret: "Just a normal secret.",
resave: false,
saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/users",{ useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

//SCHEMAS
 const userSchema = new mongoose.Schema({
  username: String,//email
  password: String,
  googleId: String,
  facebookId: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    usernameField: 'email'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    usernameField: 'email'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//HOME ROUTE
app.route("/")
.get(function(req,res){
res.render("home");
});

//AUTHENTICATION ROUTE
app.get("/auth/google",
  passport.authenticate("google",{ scope: ["profile"]})
);
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

  app.get("/auth/facebook",
  passport.authenticate("facebook")
);
  app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
});

//ABOUT ROUTE
app.route("/about")
.get(function(req,res){
  res.render("about");
});

//EXPLORE IMAGES AND POST IMAGES ROUTE
app.route("/postimage")
.get(function(req,res){
  res.render("postimage");
});

app.route("/images")
.get(function(req,res){
  res.render("explore");
})
.post(function(req,res){
  res.redirect("/images");
});

//PROFILE ROUTE
app.route("/profile")
.get(function(req,res){
  if(req.isAuthenticated()){
  res.render("profile");
}
else{
  res.redirect("/login");
}
});


//SIGNUP ROUTE
app.route("/signup")
.get(function(req,res){
res.render("signup");
})
.post(function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/signup");
    }
    else{
      passport.authenticate("local")(req,res,function(){
      res.redirect("/profile");
    });
    }
  });
});

//LOGIN ROUTE

app.route("/login")
.get(function(req,res){
res.render("login");
})
.post(function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/profile");
      });
    }
  });
});

//LOGOUT ROUTE
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});

app.listen(3000, function(){
  console.log("Server is running at port 3000");
});
