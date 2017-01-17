var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var sessions = require('client-sessions');

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
  cookieName: 'session',
  cookie: { 
    secure: true,
    maxAge: 3600000,
  }
}));
// var a = new User().save;
// console.log('db user', db.User);
// console.log('a is', a);
// console.log('user a', a);
// console.log('user a. salt', a.salt);
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

app.get('/', function(req, res) {

  // do database query
  // still need to hash

  // db.knex.select().from('users').where({username: req.session.user}).asCallback(function(err, rows) {
  //   // var username = rows[0].username;
  //   // var password = rows[0].password;
  //   // var salt = rows[0].salt;
  // });

  // // bcrypt.compare(req.session.password, password, function(err) {
  // //   if (err) {
  // //     console.log(err);
  // //   } else {
  // // //     // 
  // // //   }
  // // });
  // // bcrypt.compare current info to encrypted value
  // // bcrypt.compare(data, encrypted, function(//stuff) 

  // // if it's the same
  //   // provide access to index
  // var sess = req.session;
  // console.log('what can we even do with this thing', req.session.cookie);
  // if (req.session.cookie) {
  //   console.log('YOU HAS COOKIE');
  //   res.render('index');
  // } else {

  // if i make a get request to the homepage,
  // site should try to figure out whether or not i'm already logged in.
  // it does that my looking for my cookie.
  // my cookie should be non-expired and should have the same information that site implanted in it when i logged in.
  // my cookie will not have that information if i haven't logged in.
  // so, upon login, establish new session and set cookie with specific information.

  res.redirect('/login');
  // }
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
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

app.post('/login', function(req, res) {
  console.log('we are posting username and password to login');
  console.log('session username:', req.session.username);
  var user = new User({
    username: req.body.username,
    password: req.body.password,
  }).save();
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
