const redirectRouter = require('express').Router();
const { redirect } = require('../controllers/redirect.controller');

// Short code redirect — must be last route to avoid conflicts
redirectRouter.get('/:code([A-Za-z0-9]{4,20})', redirect);

module.exports = redirectRouter;
