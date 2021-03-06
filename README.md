# Intro

Code sample for a channel integration that connects Zendesk and WhatsApp from Nexmo's Messages API, built using Node Express.

### Description

This repository contains the source code for an integration service that connects
Zendesk to Nexmo.

The service covers the following responsibilities:

1. Authorization with Nexmo: The user provides their Nexmo assigned WhatsApp number and a JWT to use the Messages API.
2. Messaging Notifications from Nexmo: Serving as a webhook for Nexmo's Messaging API, it will receive inbound POST requests that will notify it on message updates (delivery receipts, inbound messages, etc).
3. Implementation of Zendesk's API: It provides a list of methods used by Zendesk to create the channel integration - sending the Manifest, replying to 'Pull' requests, etc.

_NOTE: THIS IS NOT AN EXAMPLE OF A PROPERLY SECURED INTEGRATION._

### How does it work?

1. An end user sends a message over WhatsApp and this service receives it from the inbound messages Webhook
2. Zendesk invokes the "pull" method and the service respondes with the new messages it has received since the last pull
3. The "pull" method returns data about the WhatsApp message & Zendesk creates a Ticket to represent the WhatsApp message (or a reponse to an existing ticket)
4. A Zendesk agent responds to the Zendesk Ticket by creating a new Zendesk Comment
5. Zendesk invokes the "channelback" method, passing along data about the Zendesk Comment
6. The "channelback" method sends a message using the Nexmo API to represent the Zendesk comment

Take a look at the following diagram:

![diagram](./architecture.png)

### Setup

The setup is divided into two parts-

1. Configuring your Nexmo Messaging Application
2. Installing & Configuring the Sample Application in your Zendesk account

#### Configuring Your Nexmo Messaging Application

Enter the [Nexmo Dashboard](https://dashboard.nexmo.com/sign-in) and in the left panel choose 'Messages and Dispatch' -> 'Your applications', choose your desired application and configure the Inbound URL. The URL should be that of the integration, as it will receive the inbound WhatsApp messages and dispath them to Zendesk. For the purpess of a POC, you can use the default integration we have deployed for the purpess of a POC and set it to _enter URL_.

#### Installing & Configuring the Sample Zendesk Application

Zendesk uses an application to define your integration, meaning that your application will contain the information needed to hit this specific integration. For more information please visit [Zendesk's documentation](https://developer.zendesk.com/apps/docs/zendesk-apps/resources).

By default the application included in this repository points to a deployed version of the integration, so all you need to do is to install the applicatio in your Zendesk dashboard, by using the ./packed_app/nexmo_ci_app.zip file. For more details and how to install an app on Zendesk please [see here](https://develop.zendesk.com/hc/en-us/articles/360001069347-Uploading-and-installing-a-private-app).

Once installed, you can now add WhatsApp numbers to your Zendesk account. For every WhatsApp number you will need to define an account.
On the Zendesk dashboard go to the 'Admin' page from your left side panel -> choose 'Channel Integrations' -> pick your installed integration -> choose 'Accounts' -> press 'Add account'.

_Add a picture here_

Zendesk will send a request to your integration for the admin UI, the integration will return an HTML page with the following fields:

1. Name - The name of this account
2. JWT - The JWT provided for this account to send messages using Nexmo's Messaging API
3. WhatsApp Number - The number associated with this specific account

After hitting send, you should have your number configured with this Zendesk account.

_NOTE: You could add multiple numbers to this integration._

That's it! You're all set and from now on inbound messages to your Nexmo number on WhatsApp will appear as tickets (or responses to an existing ticket), and responses on those tickets will be sent via WhatsApp to your customers.
