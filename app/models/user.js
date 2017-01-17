var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


// need to initialize this model class
var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  defaults: {},

  initialize: function(attr) {
    this.on('creating', function(model, attr, options) {
      bcrypt.genSalt(16, function(err, salt) {
        if (err) {
          console.log('you spilled the salt', err);
        } else {
          bcrypt.hash(attr.password, salt, null, function(err, hashedPW) {
            if (err) {
              console.log('error hashing password', err);
            } else {
              console.log(attr, attr.username, salt, hashedPW);
              db.knex('users').where({ username: attr.username }).update({
                salt: salt, password: hashedPW
              }).asCallback(function() {
                console.log('inserted user into database');
              });
            }
          });
        }
      });
    });
  }
});

module.exports = User;