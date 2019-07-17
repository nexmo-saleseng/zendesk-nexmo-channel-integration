# Intro 
Code sample for a channel integration that connects Zendesk and Nexmo's Messages API, built using Node Express 

## Description
This repository contains the source code for an integration service that connects
Zendesk to Nexmo. 

The service covers the following responsibilities: 

1. Authorization with Nexmo: The user provides their Nexmo assigned WhatsApp number and a JWT to use the Messages API.
2. Messaging Notifications from Nexmo: Serving as a webhook for Nexmo's Messaging API, it will received inbound POST requests that will notify it on message updates (delivery receipts, inbound messages, etc).  
3. Implementation of Zendesk's API: It provides a list of methods used by Zendesk to create the channel integration - sending the Manifest, replying to 'Pull' requests, etc. 

NOTE: THIS IS NOT AN EXAMPLE OF A PROPERLY SECURED INTEGRATION. 