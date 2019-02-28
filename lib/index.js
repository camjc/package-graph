const compact = require("lodash/fp/compact");
const compose = require("lodash/fp/compose");
const fetch = require("node-fetch");
const filter = require("lodash/fp/filter");
const flatten = require("lodash/fp/flatten");
const get = require("lodash/fp/get");
const includes = require("lodash/fp/includes");
const join = require("lodash/fp/join");
const keys = require("lodash/fp/keys");
const map = require("lodash/fp/map");
const zip = require("lodash/fp/zip");
const reject = require("lodash/fp/reject");
var argv = require("minimist")(process.argv.slice(2));
const mapWithKey = map.convert({ cap: false });

const query = `
  query {
    organization(login: "${argv.organization}") {
      repositories(first: 100) {
        nodes {
          pullRequests(first: 100, states: [OPEN], orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes {
              author {
                login
              }
            }
          },
          isArchived,
          content: object(expression: "master:package.json") {
            ... on Blob {
              text
            }
          }
        }
      }
    }
  }`;

const getUnarchivedNodes = compose(
  reject("isArchived"),
  get("data.organization.repositories.nodes"),
  JSON.parse
);

const getListOfPackageObjects = compose(
  map(JSON.parse),
  map((textOfPackageJson) => textOfPackageJson || JSON.stringify({})),
  map("content.text"),
);

const getDependencyRelationship = ({ packageJson, pullRequestCount }) => (_version, dependency) => ({
  dependency,
  isDev: includes(dependency)(keys(packageJson.devDependencies)),
  package: packageJson.name,
  pullRequestCount,
});

const getDependencyRelationshipsForPackageJson = ([packageJson, pullRequestCount]) =>
  mapWithKey(getDependencyRelationship({ packageJson, pullRequestCount }), {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  })

const getStringFromDependencyRelationship = ({ dependency, isDev, package, pullRequestCount }) =>
  `"${dependency}" -> "${package}"${isDev ? ' [style="dashed"]' : ""};\n "${package}" [label="${package}\n${pullRequestCount}"];`;

const getDotFileBody = compose(
  join("\n"),
  map(getStringFromDependencyRelationship),
  filter(({ dependency }) => includes(argv.organization)(dependency)),
  flatten,
  map(getDependencyRelationshipsForPackageJson)
);

const header = `
digraph {
  compound=true;
  overlap=scalexy;
  splines=true;
  layout=neato;
`;
const footer = "}";

fetch("https://api.github.com/graphql", {
  method: "POST",
  body: JSON.stringify({ query }),
  headers: {
    Authorization: `Bearer ${argv.accessToken}`
  }
})
  .then(res => res.text())
  .then(body => {
    const unarchivedNodes = getUnarchivedNodes(body);

    const listOfPackageObjects = getListOfPackageObjects(unarchivedNodes);
    const listOfPullRequestCounts = map('pullRequests.nodes.length')(unarchivedNodes)

    const zippedRepoInfo = zip(listOfPackageObjects, listOfPullRequestCounts)

    const dotFileBody = getDotFileBody(zippedRepoInfo);

    console.log([header, dotFileBody, footer].join("\n"));
  })
  .catch(console.error);
