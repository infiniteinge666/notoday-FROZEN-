/**
 * NoToday Backend — routes.js (LOCKED SURFACE)
 * - Declares only the allowed public routes
 * - Delegates immediately to handlers
 * - Contains no business logic
 */
'use strict';

const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');

module.exports = function registerRoutes(app) {
  app.post('/check', httpCheckHandler);
  app.get('/intel', httpIntelHandler);
};
