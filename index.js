/****************
Express
*****************/

var express = require('express');
var app = express();

/****************
Express middleware
*****************/

var request = require('request');
var sass = require('node-sass');
var sassMiddleware = require('node-sass-middleware');
var bodyParser = require('body-parser');
var basicAuth = require('basic-auth-connect');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');

var jsonParser = bodyParser.json();

/****************
Utilities
*****************/

var path = require('path');
var url = require('url');
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

/****************
POSTGRESQL
*****************/

var Sequelize = require('sequelize');
var sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'postgres'
});

// use one model for tracking Burners

var Burner = sequelize.define('burner', {
  burnerId: Sequelize.STRING,
  burnerName: Sequelize.STRING,
  accessToken: Sequelize.STRING,
  active: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true}
});

sequelize.sync();

var updateOrCreate = function (model, where, newItem, onCreate, onUpdate) {
    // First try to find the record
    model.findOne({where: where}).then(function (foundItem) {
        if (!foundItem) {
            // Item not found, create a new one
            model.create(newItem)
                .then(onCreate);
        } else {
            // Found an item, update it
            model.update(newItem, {where: where})
                .then(onUpdate);
            ;
        }
    })
}

/****************
Oauth config
*****************/

var BASE_URL="http://api.burnerapp.com"
var ACCESS_TOKEN_URL="http://api.burnerapp.com/oauth/access"
var AUTH_URL="http://app.burnerapp.com/oauth/authorize"

var ClientOAuth2 = require('client-oauth2');

var scopes = process.env.SCOPE.split(",");

var burnerAuth = new ClientOAuth2({
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	accessTokenUri: ACCESS_TOKEN_URL,
	authorizationUri: AUTH_URL,
	redirectUri: process.env.CALLBACK_URL,
	scopes: scopes
})

/****************
Express setup
*****************/

// Use cookies for lightweight storage
// You'll most likely want to store data in your own DB

app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ["gM08wg3O0iy69TRp6wYU8u7QP9RHYzFO"],
  maxAge: 48 * 60 * 60 * 1000 // 12 hours 
}));

// Compile SASS

app.use(sassMiddleware({
	src: path.join(__dirname,'scss'),
	dest: path.join(__dirname,'public/stylesheets'),
	prefix: '/stylesheets',
	includePaths:[path.join(__dirname, 'node_modules/foundation-sites/assets/')],
	debug: true,
	outputStyle: 'extended'
}));

// Setup web server

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public')); // where images/css/js are served
app.set('views', __dirname + '/views'); // where webpages are served
app.set('view engine', 'ejs');

// Hide from robots

app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

/****************
Shared functions
*****************/

/*
Returns a formatted phone number in national (###) ### #### format
*/

function formattedPhoneNumber(pn) {
	var phoneNumber = phoneUtil.parse(pn, 'US');

	return phoneUtil.format(phoneNumber, PNF.NATIONAL);
}

function getBurnerInfo(burnerId, accessToken, success, error) {

  // Call Burner API

  var burnersEndpoint = "/v1/burners";
  var endpoint = url.resolve(BASE_URL, burnersEndpoint);
  var auth = "Bearer " + accessToken;
  var qs = burnerId != null ? {burnerId: burnerId} : null;

  request({
    method: 'GET',
    uri: endpoint,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    'qs': qs,
  }, function(error, response, body) {
    if(error) {
      console.log(error);
      error();
    } else {
      console.log(body);
      success(body);
    }

  });
}

function sendMessage(payload, accessToken, success, error) {

  // Call Burner API

  var messagesEndpoint = "/v1/messages";
  var endpoint = url.resolve(BASE_URL, messagesEndpoint);
  var auth = "Bearer " + accessToken;

  request({
    method: 'POST',
    uri: endpoint,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    'json': true,
    'body' : payload
  }, function(error, response, body) {
    if(error) {
      console.log(error);
      error();
    } else {
      console.log(body);
      success();
    }

  });
}

/****************
API Routes
*****************/

/*
Listen for incoming messages and respond with a GIF if the text isn't too long
*/

app.post('/messages', jsonParser, function(req, res) {

  // parse message
  var type = req.body.type;

  if (type != "inboundText") {
    res.sendStatus(200);
    return;
  }

  var message = req.body.payload;
  var burnerId = req.body.burnerId;
  var fromNumber = req.body.fromNumber;
  var to = fromNumber;

  Burner.findOne({where: {burnerId: burnerId}}).then(function (foundItem) {

    if (!foundItem) {
      res.sendStatus(404);
    } else {

      // get burner info from DB
      var burnerId = foundItem.burnerId;
      var accessToken = foundItem.accessToken;

      // ignore messages that are too long - 4 words max
      if(message.split(" ").length > 4) {

        sendMessage({burnerId: burnerId, 
                     text: "Text a phrase, not a novel to get the best GIFs back!", 
                     toNumber: to
                    }, 
                    accessToken, 
                    function() {
                      res.sendStatus(200);
                      console.log("Successfully sent message" + to);
                    }, function() {
                      res.sendStatus(200);
                      console.log("Error sending image");
                    });

        return;
      }

      // fetch a message from giphy

      var giphyAPIKey = process.env.GIPHY_KEY;
      var giphyURL = "http://api.giphy.com/v1/gifs/random";

      request({
        method: 'GET',
        uri: giphyURL,
        'qs': {api_key: giphyAPIKey, tag: message}
      }, function(error, response, body) {

        if(error) {
          res.sendStatus(400);
        } else {

          // send gif
          var gif = JSON.parse(body);
          console.log(gif);
          
          var mediaUrl = gif.data.image_url;
          var text = "";

          var jsonBody = {"mediaUrl": mediaUrl, "burnerId": burnerId, text: text, toNumber: to};

          sendMessage(jsonBody, accessToken, function() {
            console.log("Successfully sent " + mediaUrl + " to " + to);
          }, function() {
            console.log("Error sending image");
          })
        }

      });
    }
  });
});

/****************
Web Routes
*****************/

/*
Main page - authorize burner or display home page if authorized
*/

app.get('/', function(req, res) {

	if (!req.session.token) {
  	res.render('pages/index');
  } else {
  console.log("token: " + req.session.token);
    // find burners for this access token
    Burner.findAll({
      where: {accessToken: req.session.token}
    }).then(function(items) {

      // update burner info
      getBurnerInfo(null, req.session.token, function(body) {
        
        var gifBurners = [];
        var allBurners = JSON.parse(body);

        allBurners.forEach(function(burner) {
          items.forEach(function(gifBurner) {
            if (burner.id == gifBurner.burnerId) {
              gifBurners.push(burner);
            }
          });
        });

        res.render('pages/home', {allBurners: allBurners, gifBurners: gifBurners});

      }, function() {
        res.render(400);
        console.log("error");
      });

    });

  }
});

/*
Start OAuth flow
*/

app.get('/authorize', function(req, res) {
  
	console.log("Redirecting to: " + burnerAuth.code.getUri());
	var uri = burnerAuth.code.getUri();

  	//redirect
  	res.redirect(uri);
});

/*
Callback from OAuth
	- find first burner the user has
	- store burner data as json in cookie
	- store access token in cookie
*/

app.get('/oauth/callback', function(req, res) {

	burnerAuth.code.getToken(req.originalUrl)
		.then(function (user) {

      req.session.token = user.accessToken;
      var connectedBurners = user.data.connected_burners;

      console.log(user.data);

      // create burner objects with user's access token for each connected burner

      connectedBurners.forEach(function(element) {
        console.log("burner id: " + element.id);
        console.log("burner name: " + element.name);

        updateOrCreate(
          Burner, {burnerId: element.id}, {burnerName: element.name, burnerId: element.id, accessToken: user.accessToken},
          function () {
            console.log('created');
            res.redirect("/");
          },
          function () {
            console.log('updated');
            res.redirect("/");
          });
    });

  });

});

/*
Log that app has successfully started
*/

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});