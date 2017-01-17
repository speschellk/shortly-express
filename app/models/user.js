var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


// need to initialize this model class
var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,

  initialize: function() {
    console.log('i made a user');
    this.on('creating', function(model, attrs, options) {
      var shasum = crypto.createHash('sha1');
      // shasum.update(model.get('url'));
      model.set('salt', shasum.digest('hex').slice(0, 17)); // TODO: generate and set a password hash
    });
  }
});

module.exports = User;