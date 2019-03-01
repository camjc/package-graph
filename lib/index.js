const fetch = require("node-fetch");
const buildProcessResponse = require("./build-process-response");

var argv = require("minimist")(process.argv.slice(2));

const query = `
  query {
    organization(login: "${argv.organization}") {
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
        }
      }
    }
  }
`;

fetch("https://api.github.com/graphql", {
  method: "POST",
  body: JSON.stringify({ query }),
  headers: {
    Authorization: `Bearer ${argv.accessToken}`
  }
})
  .then(res => res.text())
  .then(buildProcessResponse(argv.organization))
  .catch(console.error);
