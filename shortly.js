var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var sessions = require('client-sessions');

//nobody knows we're supposed to have this
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


// begin user session 
app.use(cookieParser());
app.use(session({
  secret: 'asdlkfjadgkjasd8753fkjncweo2inlasdjkn',
  resave: true,
  saveUninitialized: false,
}));
// var a = new User().save;
// app.get('/', function(req, res, next) {
//   console.log('req session', req.session);
//   var sess = req.session;
//   console.log('sess is', sess);
//   if (sess.views) {
//     sess.views++;
//     res.setHeader('Content-Type', 'text/html');
//     res.write('<p>views: ' + sess.views + '</p>');
//     res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
//     res.end();
//   } else {
//     sess.views = 1;
//     res.end('welcome to the session demo. refresh!');
//   }
// });

// TODO: Authenticate with cookie?
app.get('/', function(req, res) {

  // check cookie to determine that authenticated user is still signed in
  // do database query
  // req.body.user = 'here';
  // req.body.password = 'wego';
  console.log('/ : reqbodyusername', req.body.username);
  console.log('/ : req session is', req.session);
  db.knex.select('password', 'salt').from('users').where({username: req.session.user.username}).asCallback(function(err, rows) {
    // if user not found in db, redirect to login page
    if (!rows[0] || rows[0].length <= 0) {
      console.log('/ : You do not exist in the db.');
      res.redirect('login');
    } else {
      console.log('/ : You exist in the db.');
      bcrypt.compare(req.session.user.password, rows[0].password, function(err, result) {
        if (err) {
          console.log('error comparing passwords', err);
        } else {
          console.log('/ : You exist in the db and your passwords match.');
          console.log('rendering index for you');
          res.render('index');
        }
      });
    }
    // compare user's password to hashed password associated with that user

  });

  // if i make a get request to the homepage,
  // site should try to figure out whether or not i'm already logged in.
  // it does that my looking for my cookie.
  // my cookie should be non-expired and should have the same information that site implanted in it when i logged in.
  // my cookie will not have that information if i haven't logged in.
  // so, upon login, establish new session and set cookie with specific information.

  // res.redirect('/login');
  // }
});

// DONE
app.get('/login', function(req, res) {
  res.render('login');
});

// TODO: try moving 'save' method to initialize model
app.post('/login', function(req, res) {
  console.log('/login: BODY', req.body);
  db.knex.select().from('users').where({username: req.body.username}).asCallback(function(err, rows) {
    // if user not found in db, redirect to login page
    if (!rows[0] || rows[0].length <= 0) {
      console.log('/login: User is not in the database.');
      res.redirect('login');
    } else {
      console.log('/login: User is in the database!');
      bcrypt.compare(req.body.password, rows[0].password, function(err, result) {
        if (err) {
          console.log('Passwords do not match.', err);
        } else {
          // Username in db and passwords match
          console.log('/login: User is authenticated.');
          req.session.user = rows[0];
          console.log('/login: User is', req.session.user);
          console.log('redirecting to / page');
          res.redirect('/');
          // res.render('index');
        }
      });

    }
    // compare user's password to hashed password in db

  });
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

// DONE
app.get('/signup', function(req, res) {
  res.render('signup');
});

// TODO: cookie
app.post('/signup', function(req, res) {

  new User({ username: req.body.username }).fetch().then(function(found) {
    if (found) {
      console.log('WE FOUND YOU, MANG');
      res.status(200).send();
    } else {
      console.log('we did not find you');
      Users.create({
        username: req.body.username,
        password: req.body.password
      })
      .then(function(whatever) {
        res.status(200).send(whatever);
      });
    }
  });
  // stick a cookie on them now
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

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

// add isAuthenticated method



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
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
