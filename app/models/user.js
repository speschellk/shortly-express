var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


// need to initialize this model class
var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  defaults: {},

  initialize: function(attr) {
    var potato = this;
    // generate salt for new user
    bcrypt.genSalt(16, function(err, salt) {
      if (err) {
        console.log('error salting the potato', err);
      } else {
        // set salt in users db
        potato.set('salt', salt);
        // generate hashed password based on salt
        bcrypt.hash(attr.password, salt, null, function(err, hashedPW) {
          if (err) {
            console.log('error hashing password', err);
          }
          // set hashed password in users db
          potato.set('password', hashedPW);
        });
      }
    });
  }
});

module.exports = User;