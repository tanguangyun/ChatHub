const passport = require('passport');

const requireLdapAuth = (req, res, next) => {
  passport.authenticate('ldapauth', (err, user, info) => {
    if (err) {
      console.log({
        title: '(requireLdapAuth) Error at passport.authenticate',
        parameters: [{ name: 'error', value: err }],
      });
      return next(err);
    }
    if (!user) {
      console.log({
        title: '(requireLdapAuth) Error: No user',
      });
      return res.status(404).send(info);
    }
    req.user = user;
    next();
  })(req, res, next);
};
module.exports = requireLdapAuth;
