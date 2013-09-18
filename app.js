var util = require('util'),
  express = require('express'),
  path = require('path'),
  fs = require('fs'),
  request = require('request'),
  googleapis = require('googleapis'),
  im = require('imagemagick'),
  settings = {
    server: {
      hostname: 'mktgdept.com',
      port: '5555'
    },
    google: {
      client_id: '000000000000.apps.googleusercontent.com',
      client_secret: 'bbbbbbbbbbbbbbbbbbbbbbbb'
    },
    twilio: {
      account_sid: 'ACnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn',
      auth_token: 'oooooooooooooooooooooooooooooooo',
      caller_id: '12505555555',
      to_number: '15795555555'
    }
  },
  Twilio = require('twilio'),
  twilio = Twilio(settings.twilio.account_sid, settings.twilio.auth_token),
  template = function(text, title, image) {
    return '<article class="photo"><img src="' + image + '" width="100%" height="100%"><div class="photo-overlay"></div><section><div class="text-auto-size">' + text + '</div></section><footer><p class="red">' + title + '</p></footer></article>';
  },
  OAuth2Client = googleapis.OAuth2Client,
  oauth2Client = {},
  app = express();

app.configure(function() {
  app.use(express.bodyParser({ uploadDir: path.join(__dirname, '/tmp') }));
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
  if(!oauth2Client.credentials) {
    oauth2Client = new OAuth2Client(settings.google.client_id, settings.google.client_secret, 'http://' + settings.server.hostname + ':' + settings.server.port + '/oauth2callback');
    res.redirect(oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/glass.timeline'
    }));
  }
  else {
    googleapis.discover('mirror', 'v1').execute(function(err, client) {
      client.mirror.subscriptions.insert({
        callbackUrl: 'https://mirrornotifications.appspot.com/forward?url=http://' + settings.server.hostname + ':' + settings.server.port + '/subcallback',
        collection: 'timeline',
        operation: [ 'INSERT' ]
      }).withAuthClient(oauth2Client).execute(function(err, result) {
        console.log('mirror.subscriptions.insert', util.inspect(result));
      });
      client.mirror.contacts.insert({
        displayName: 'MMS',
        id: 'glassmms',
        imageUrls: [ 'http://' + settings.server.hostname + ':' + settings.server.port + '/contact_image.png' ],
        acceptTypes: [ 'image/*' ]
      }).withAuthClient(oauth2Client).execute(function(err, result) {
        console.log('mirror.contacts.insert', util.inspect(result));
      });
    });
    res.send(200);
  }
});

app.get('/oauth2callback', function(req, res) {
  oauth2Client.getToken(req.query.code, function(err, tokens) {
    oauth2Client.credentials = tokens;
    res.redirect('/');
  });
});

app.post('/incoming', function(req, res) {
  var mms = req.body, twiml = new Twilio.TwimlResponse();
  console.log('/incoming', util.inspect(mms));
  googleapis.discover('mirror', 'v1').execute(function(err, client) {
    client.mirror.timeline.insert({
      html: template(mms.Body, mms.From, mms.MediaUrl0),
      menuItems: [
        {
          action: 'DELETE'
        }
      ],
      notification: {
        level: 'DEFAULT'
      }
    }).withAuthClient(oauth2Client).execute(function(err, result) {
      console.log('mirror.timeline.insert', util.inspect(result));
    });
  });
  res.send(twiml.toString());
});

app.post('/subcallback', function(req, res) {
  res.send(200);
  var id = req.body.itemId;
  console.log('/subcallback', util.inspect(req.body));
  if(req.body.operation == 'INSERT')
    googleapis.discover('mirror', 'v1').execute(function(err, client) {
      client.mirror.timeline.get({ id: id }).withAuthClient(oauth2Client).execute(function(err, result) {
        console.log('mirror.timeline.get', util.inspect(result));
        if(result.attachments && result.attachments.length)
          request({
            method: 'GET',
            uri: result.attachments[0].contentUrl,
            headers: {
              'Authorization': [ oauth2Client.credentials.token_type, oauth2Client.credentials.access_token ].join(' ')
            },
            encoding: 'binary'
          }, function(err, req, body) {
            fs.writeFile(path.join(__dirname, '/tmp/', id + '.jpg'), body, 'binary', function(err) {
              im.resize({
                srcPath: path.join(__dirname, '/tmp/', id + '.jpg'),
                dstPath: path.join(__dirname, '/public/', id + '.jpg'),
                width:   256
              }, function(err, stdout, stderr) {
                if(err)
                  throw err;
                twilio.messages.create({
                    body: 'MMS from Google Glass',
                    to: result.text || settings.twilio.to_number,
                    from: settings.twilio.caller_id,
                    mediaUrl: 'http://' + settings.server.hostname + ':' + settings.server.port + '/' + id + '.jpg'
                  }, function(err, res) {
                    if(err)
                      console.log('err', util.inspect(err));
                    console.log('twilio.messages.create', util.inspect(res));
                });
              });
            });
          });
      });
    });
});

app.get('/number', function(req, res) {
  res.send(settings.twilio.to_number);
});

app.get('/number/:digits', function(req, res) {
  settings.twilio.to_number = '' + req.params.digits;
  res.send('to_number set to ' + settings.twilio.to_number);
});

app.listen(settings.server.port);
