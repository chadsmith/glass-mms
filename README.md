# Glass MMS

Send and receive MMS's using Google Glass.

##Prerequisites

* Google Glass w/ access to Mirror API
* Node.js, NPM
* [Twilio](http://www.twilio.com/)

## Installation

`npm install` or `npm install express twilio request imagemagick googleapis`

## Configuration

* Create a new [Google APIs Project](https://code.google.com/apis/console)
* Enable the Google Mirror API
* Create an OAuth 2.0 client ID for a web application
* Enter your server's hostname and port in app.js
* Enter your Mirror API credentials in app.js
* Enter your [Twilio API](https://www.twilio.com) credentials, Canadian phone number and a default to number in app.js
* Change your Twilio number's callback address to http://hostname:port/incoming

## Usage

`node app` or `forever start app.js`

* Authorize the app by visiting http://hostname:port/ on your computer
* Send an MMS by sharing a photo with Glass MMS, speak a phone number in the caption to override the default number
* View photos you receive in your Glass timeline
* Change the number to send a photo to by visiting http://hostname:port/number/{digits} on your computer
