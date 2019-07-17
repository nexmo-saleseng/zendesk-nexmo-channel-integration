'use strict';

const request = require('request');
const htmlparser = require('htmlparser2');
const uuidv4 = require('uuid/v4');
const Message = require('./message'); 
const messageQueues = new Object(); 

/**
 * Escapes a string for inclusion in an HTML form input.
 *
 * @param {string} input String to be escaped
 * @returns {string} Escaped string
 */ 
function escapeString(input) {
  if (input) { 
    return input.replace(/"/g, '&quot;');
  }
}

/**
 * Calculates the HTML for an admin UI page
 *
 * @param {string} name The name of the integration instance
 * @param {string} returnUrl Zendesk URL to which metadata and state should be
 * posted
 * @param {string} warning Warning string to be displayed to user, e.g. when
 * redisplaying page after encountering errors.  May contain HTML, may be null.
 * @returns {string} HTML
 */
function adminUiHtml(name, metadata, returnUrl, warning) {
  let warningStr = '';

  if (warning) {
    warningStr = `${warning}<br>`;
  }

  return `<html><body>
      <form method="post" action = "./admin_ui_2">
        Name:
          <input type="text" name="name" value="${escapeString(name ? name : "Name")}"><br>
        JWT:
          <input type="text" name="jwt" value="${escapeString(metadata.jwt ? metadata.jwt : "Enter your JWT")}"><br>
        WhatsAppNumber:
          <input type="text" name="whatsappNumber" value="${escapeString(metadata.whatsappNumber ? metadata.whatsappNumber : "Enter your WhatsApp number")}"><br>
        <input type="hidden"
               name="return_url"
               value="${escapeString(returnUrl)}"></input>  
        ${warningStr}
        <input type="submit">
      </form>
    </body></html>`;
}

/**
 * Returns the manifest for this integration as JSON.
 * @param {Object} res Response object to which JSON will be written
 */
exports.manifest = res => {
  res.send({
    name: 'Messages API',
    id: 'com.nexmo.integrations.messages.api.three',
    author: 'Roy Ben Shoushan',
    version: 'v0.0.2',
    channelback_files: true,
    urls: {
      admin_ui: './admin_ui',
      pull_url: './pull',
      channelback_url: './channelback',
      clickthrough_url: './clickthrough',
      healthcheck_url: './healthcheck', 
      event_callback_url: './event_callback'
    }
  });
};

/**
 * Returns the HTML for the administrative UI for setting up or editing
 * metadata for the Nexmo integration.  It displays a form allowing the
 * administrator to set the login and password for Nexmo. 
 * When the administrator submits the form, the information will be POSTed to
 * admin_ui_2, which is responsible for validating and formatting the
 * information.
 *
 * @param {string} returnUrl URL in Zendesk to which updated metadata should be
 *  POSTed
 * @param {string} name Initial name of account, to be edited by
 *  Administrator.  May be blank.
 * @param {Object} metadata Initial value of metadata, which contains secret. 
 * @param {Object} res Response object to which HTML will be written
 */
exports.admin_ui = (returnUrl, name, metadata, res) => {
  const html = adminUiHtml(
    name, 
    metadata,
    returnUrl);

  res.send(html);
};

/**
 * Receives administrator input via a POST from admin_ui, validates and
 * transforms the input to a standardized format
 * In case of error, displays same HTML as admin_ui (with some error info) to
 * allow administrator to correct the information.
 *
 * @param {Object} attributes Arguments passed from admin_ui
 * @param {Object} res Response object to which HTML will be written
 */
exports.admin_ui_2 = (attributes, res) => {

  let metadata = JSON.stringify({
    name: attributes.name, 
    jwt: attributes.jwt, 
    whatsappNumber: attributes.whatsappNumber
  });
  
  if (!messageQueues[attributes.whatsappNumber]) { 
    messageQueues[attributes.whatsappNumber] = []; 
  }
  

        res.send(`<html><body>
          <form id="finish"
                method="post"
                action="${escapeString(attributes.return_url)}">
            <input type="hidden"
                   name="name"
                   value="${escapeString(attributes.name)}">
            <input type="hidden"
                   name="metadata"
                   value="${escapeString(metadata)}">
          </form>
          <script type="text/javascript">
            // Post the form
            var form = document.forms['finish'];
            form.submit();
          </script>
        </body></html>`);
}; 

/**
 * Receives metadata and state from Zendesk, makes API calls to Nexmo, and
 * returns formatted data to Zendesk.
 * 
 * @param {Object} metadata The metadata containing connection information for
 *  Nexmo, etc.  This was created by admin_ui_2.
 * @param {Object} state The current state of pull.  In our case, this contains
 *  a timestamp of the most recent comment we've successfully imported.
 * @param {Object} res Response object to which JSON results will be written
 */
exports.pull = (metadata, state, res) => {
  const resources = []; 
  const messages = messageQueues[metadata.whatsappNumber]; 

  if (messages) { 
    messages.forEach(message => { 
    const isoDate = new Date().toISOString(); 

    let resource = {
      //UUID for now
      external_id: uuidv4(),
      //Zendesk will link all messages from this user to a single ticket 
      thread_id: message.getFrom(), 
      message:     message.getContent(),
      html_message: message.getContent(),
      created_at: isoDate, 
      author: { 
        external_id: message.getFrom(), 
        fields: [ 
          { id: 'notes', value: 'Sent from WhatsApp number ' + message.getFrom() }, 
          { id: 'subject', value: 'Customer request through WhatsApp' }
         ], 
      }, 
      allow_channelback: true, 
    }

    resources.push(resource); 
  }); 

  while(messages.length > 0) {
    messages.pop();
  }
}
  else { 
    console.log('no messages to pull from queue ' + metadata.whatsappNumber);
  }

  res.json({ external_resources: resources }); 
};

/**
 * Channelback is invoked when Zendesk agents to respond to Nexmo comment
 * in the Zendesk/AnyChannel ticket lifecycle. The Zendesk/AnyChannel ticket
 * lifecycle is:
 * 1. An end user sends a message over WhatsApp
 * 2. Zendesk invokes the "pull" method
 * 3. The "pull" method returns data about the WhatsApp message
 * 4. Zendesk creates a Ticket to represent the WhatsApp message
 * 5. A Zendesk agent responds to the Zendesk Ticket by creating a new Zendesk
 *    Comment
 * 6. Zendesk invokes the "channelback" method, passing along data about the
 *    Zendesk Comment
 * 7. The "channelback" method sends a message to represent the
 *    Zendesk comment
 * @param {string} thread_id The ID of the zendesk ticket which is the customer's 
 *   WhatsApp number
 * @param {string} message The text of the message we will send 
 * @param {Object} metadata The metadata containing connection information for
 *  Nexmo - This was created by admin_ui_2.
 * @param {Object} res Response object to which JSON results will be written
 */
exports.channelback = (message, thread_id, metadata, res) => {
  const to = thread_id; 

  var options = {
    uri: 'https://sandbox.nexmodemo.com/v0.1/messages/',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + metadata.jwt, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    json: {
      from: { type: 'whatsapp', number: metadata.whatsappNumber },
      to: { type: 'whatsapp', number: to },
      message: {
        content: {
          type: 'text',
          text: message
        },
        whatsapp: {
          policy: 'deterministic', 
          locale: 'en', 
        }
      }
    }
  };
  
  request(options, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      console.log('successfuly sent message to: ' + to + ', with message: ' + message);
    } 
  });

  res.status(200).json({ external_id: uuidv4(), allow_channelback: true }); 
};

/**
 * Zendesk may request the healthcheck endpoint to assure that the integration
 * is running and healthy
 *
 * @param {Object} res Response object used to return health information
 */
exports.healthcheck = res => {
  res.sendStatus(200);
};

exports.onMessageReceived = (from, to, content) => { 
  const message = new Message(from, content); 
  if (messageQueues[to]) { 
    messageQueues[to].push(message); 
  } else { 
    console.log('error pushing message (' + message + ') to queue of number ' + from); 
  }
}; 