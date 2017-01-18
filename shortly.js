var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

// Initialize app
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


// Create session cookie
app.use(cookieParser());
app.use(session({
  secret: 'asdlkfjadgkjasd8753fkjncweo2inlasdjkn',
  resave: false,
  saveUninitialized: false,
}));

// Render homepage if user is logged in
app.get('/', util.checkUser, function(req, res) {
  res.render('index');
});

// Render index if user is logged in
app.get('/create', util.checkUser, function(req, res) {
  res.render('index');
});

// Render links if user is logged in
app.get('/links', util.checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

// Allow logged in user to create a short link
app.post('/links', util.checkUser, function(req, res) {
  var uri = req.body.url;

  // Send 404 response for invalid urls
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  // Prep link attributes for short form
  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      // Send 404 response if can't read url title
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        // Create short link
        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

// Render login page for any visitor
app.get('/login', function(req, res) {
  res.render('login');
});

// Render signup page for any visitor
app.get('/signup', function(req, res) {
  res.render('signup');
});

// Compare login credentials to users db
app.post('/login', util.checkUser, function(req, res) {
  db.knex.select().from('users').where({username: req.body.username}).asCallback(function(err, rows) {
    // if username not found in db, redirect to login page
    if (!rows[0] || rows[0].length <= 0) {
      res.redirect('login');
    } else {
      // username found in db; check submitted password for match in db
      bcrypt.compare(req.body.password, rows[0].password, function(err, result) {
        if (err) {
          console.log('Passwords do not match.', err);
        } else {
          // Username in db and passwords match; bring on home
          req.session.user = rows[0];
          res.redirect('/');
        }
      });
    }
  });
});

// Create new user in db
app.post('/signup', function(req, res) {
  new User({ username: req.body.username })
  .fetch()
  .then(function(found) {
    // Username submitted is already taken in db; reprompt to signup
    if (found) {
      console.log('Account with this username already exists');
      res.redirect('/signup');
    } else {
      // Username submitted is free; encrypt password
      bcrypt.hash(req.body.password, null, null, function(err, hash) {
        Users.create({
          username: req.body.username,
          password: hash
        })
        // Add session and cookie for newly created user
        .then(function(userData) {
          util.createSession(req, res, userData);
        });
      });
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

// Catch-all link
app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    // Short link doesn't exist; send back home
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
