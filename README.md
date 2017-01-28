# GIF Buddy getting started

GIF Buddy is a simple Node.js Burner app using [Express 4](http://expressjs.com/) and [Foundation 6](http://foundation.zurb.com/)


## Running Locally

#### Install PostgreSQL

* Install PostgreSQL from [here](https://www.postgresql.org/download/) or if you want an easy Mac OS X GUI grab it [here](https://postgresapp.com).
* Create a Database and Database user/password

#### Create your app

* Request OAuth credentials [here](https://adhoclabs.github.io/api-documentation/request-credentials).

#### Set up .env variables

* Copy the `env` file to `.env`
* Fill out the required variables.
	* `CLIENT_ID` is your OAuth client ID
	* `CLIENT_SECRET` is your application's OAuth secret
	* `SCOPE` is a comma separated list of scopes [see here](https://adhoclabs.github.io/api-documentation/authentication-scopes) for more information.
	* `DB_NAME` is the PostgreSQL database name
	* `DB_USER` is your database user
	* `DB_PASS` is your database password
	* `DB_HOST` is most likely `localhost`
	* `GIPHY_KEY` is your [giphy](http://www.giphy.com) key. The public key you can use for testing can be found [here](https://github.com/Giphy/GiphyAPI).

#### Run the app

Make sure you have [Node.js](http://nodejs.org/) installed.

```sh
$ git clone git@github.com:adhoclabs/burner-control-panel.git # or clone your own fork
$ cd gif-buddy
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

If you'd like to deploy this app to your own Heroku instance, make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) installed and then run the following commands.

```
$ heroku create
$ git push heroku master
$ heroku open
```

You'll also need to add your env file's config variables via the [Heroku CLI](https://devcenter.heroku.com/articles/config-vars)
