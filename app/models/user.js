var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


// need to initialize this model class
var User = db.Model.extend({
  initialize: function() {}
});

module.exports = User;