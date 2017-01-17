var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


// need to initialize this model class
var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  defaults: {
    username: 'bothermo',
    password: 'itstheendoftheworld'
  },

  initialize: function() {
    var potato = this;
    var salt = bcrypt.genSalt(16, function(err, data) {
      if (err) {
        console.log('error in salt', err);
      } else {
        potato.on('creating', function(model, attr, options) {
          console.log(arguments);
          model.set('salt', data); // TODO: generate and set a password hash
        });
      }
    });
  }
});

module.exports = User;