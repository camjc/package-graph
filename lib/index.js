const { Module, render } = require("viz.js/full.render.js");
const express = require("express");
const fetch = require("node-fetch");
const GitHubStrategy = require("passport-github2").Strategy;
const passport = require("passport");
const Viz = require("viz.js");
const session = require("express-session");

const buildProcessResponse = require("./build-process-response");

const app = express();

const userTokensById = {};

const ensureAuthenticatedMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/github");
}

const getQuery = organization => `
  query {
    organization(login: "${organization}") {
      repositories(first: 100) {
        nodes {
          content: object(expression: "master:package.json") {
            ... on Blob {
              text
            }
          }
          isArchived
          isPrivate
          pullRequests(first: 100, states: [OPEN], orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              author {
                login
              }
            }
          }
          url
        }
      }
    }
  }
`;

const getVisualisation = ({ accessToken, externalModule, organization }) => {
  const bearer = accessToken;
  if (!bearer) {
    throw new Error(
      "No Github personal access token. Add to query string as ?accessToken="
    );
  }

  return fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query: getQuery(organization) }),
    headers: {
      Authorization: `Bearer ${bearer}`
    }
  })
    .then(res => res.text())
    .then(buildProcessResponse({ organization, externalModule }))
    .then(digraph => new Viz({ Module, render }).renderString(digraph))
    .catch((err) => { throw new Error(err) });
};

const callbackWithUser = (user, done)  => {
  done(null, user);
};
// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(callbackWithUser);

passport.deserializeUser(callbackWithUser);

// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "https://package-graph.herokuapp.com/auth/github/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      userTokensById[profile.id] = accessToken;

      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    }
  )
);

app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: false }));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["read:org", "repo"] }),
);

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth/github" }),
  (req, res) => {
    res.redirect("/");
  }
);
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/ahmdigital');
    // res.send('You are logged in. Change the url to /yourGithubOrgHere to see your graph');
    return
  }
  res.redirect('/auth/github');
});

app.get("/logout", (req, res) => {
  if (req.session.passport.user.id) {
    delete userTokensById[req.session.passport.user.id]
  }
  req.logout();
  res.send("You are logged out");
});

app.get("/:organization", ensureAuthenticatedMiddleware, (req, res) => {
  const userToken = userTokensById[req.session.passport.user.id];
  return getVisualisation({
    accessToken: userToken,
    externalModule: req.query.externalModule,
    organization: req.params.organization
  })
    .then(visualisation => {
      res.send(visualisation);
    })
    .catch(err => res.send(err.message));
});

app.listen(process.env.PORT || 3000, function () {
  console.log(`Example app listening on port ${process.env.PORT || 3000}!`);
});
