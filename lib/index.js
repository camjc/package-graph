const { Module, render } = require('viz.js/full.render.js');
const fetch = require("node-fetch");
const Viz = require('viz.js');
var express = require('express');
var app = express();

const buildProcessResponse = require("./build-process-response");

var argv = require("minimist")(process.argv.slice(2));

const getQuery = (organization) => `
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

const getVisualisation = ({accessToken, organization}) => {
  return fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query: getQuery(organization) }),
    headers: {
      Authorization: `Bearer ${accessToken || argv.accessToken}`
    }
  })
    .then(res => res.text())
    .then(buildProcessResponse(organization))
    .then((digraph) => new Viz({ Module, render }).renderString(digraph))
    .catch(console.error);
}

app.get('/:organization', function (req, res) {
  return getVisualisation({ accessToken: req.query.id, organization: req.params.organization }).then(visualisation => {
    res.send(visualisation);
  })
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
