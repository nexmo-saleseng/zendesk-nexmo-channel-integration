/*
This file implements a Node Express service.  It connects our business logic
to Node Express. 
*/
const messagesAPI = require('./controller');
const config = require('./config');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Helper functions

/**
 * Extracts the return_url from a POST request.  The return_url is the URL
 * to which this integration should post updated metadata, state, etc.
 *
 * @param {req} req POST request
 * @returns {string}
 */
function returnUrl(req) {
  return req.body.return_url;
}

/**
 * Extracts the starting name from a POST request.  This is the name of the
 * account, which is displayed in the Zendesk admin UI.
 *
 * @param {req} req POST request
 * @returns {string}
 */
function name(req) {
  return req.body.name;
}

/**
 * Extracts the metadata from a POST request. The metadata contains the
 * information needed to connect to your Nexmo account. 
 *
 * @param {req} req POST request
 * @returns {Object} Containing name, jwt and WhatsApp number
 */
function metadata(req) {
  if (req.body.metadata) {
    return JSON.parse(req.body.metadata);
  }

  return {
    name: '',
    jwt: '',
    whatsappNumber: ''
  };
}

/**
 * Extracts the state from a POST request.  The state contains the
 * state of pull requests, specifically, the datetime of the most recently
 * pulled Comment.  If the request doesn't include state, an empty object is
 * returned.
 *
 * @param {req} req POST request
 * @returns {Object}
 */
function state(req) {
  if (req.body.state) {
    return JSON.parse(req.body.state);
  }

  return {};
}

/**
 * Extracts the external_id from a clickthrough GET request.  This is the
 * ID of the item they're clicking through on.
 *
 * @param {req} req GET request
 * @returns {string}
 */
function clickthroughId(req) {
  return req.query.external_id;
}

/**
 * 
 * Routes 
 * 
 */

/**
 * Zendesk Routes 
 **/

app.get('/manifest', (req, res) => {
  console.log("Zendesk manifest request"); 
  messagesAPI.manifest(res);
});

app.post('/admin_ui', (req, res) => {
  console.log("Zendesk admin_ui request"); 
  messagesAPI.admin_ui(returnUrl(req), name(req), metadata(req), res);
});

app.post('/admin_ui_2', (req, res) => {
  console.log("Zendesk admin_ui_2 request"); 
  messagesAPI.admin_ui_2(req.body, res);
});

app.post('/pull', (req, res) => {
  console.log("Zendesk pull request"); 
  messagesAPI.pull(metadata(req), state(req), res);
});

app.post('/channelback', (req, res) => {
  console.log("Received Zendesk channelback: " + JSON.stringify(req.body));
  messagesAPI.channelback(req.body.message, req.body.thread_id, JSON.parse(req.body.metadata), res); 
});

app.get('/clickthrough', (req, res) => {
  console.log("Zendesk Clickthrough"); 
  messagesAPI.clickthrough(clickthroughId(req), res);
});

app.get('/healthcheck', (req, res) => {
  console.log("Zendesk healthcheck"); 
  messagesAPI.healthcheck(res);
});

app.post('/event_callback', (req, res) => { 
  req.body.events.forEach((event) => { 
    console.log("Received Zendesk event: " + JSON.stringify(event));
  })

  res.sendStatus(200); 
});

/**
 * Nexmo Routes 
 **/
app.post('/inbound', (req, res) => { 
  console.log("Received Nexmo inbound event: " + JSON.stringify(req.body));

  if (req.body && req.body.direction && req.body.direction === 'inbound') { 
    //By default channel is WhatsApp 
    const fromNumber = req.body.from.number; 
    const toNumber = req.body.to.number; 
    const content = req.body.message.content.text; 
    
    console.log("new message from: " + fromNumber + ", content: " + content);
    
    messagesAPI.onMessageReceived(fromNumber, toNumber, content); 
  }
  res.sendStatus(200); 
}); 

// Startup
app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);  // eslint-disable-line no-console
});