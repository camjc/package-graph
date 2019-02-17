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
const reject = require("lodash/fp/reject");
var argv = require('minimist')(process.argv.slice(2));
const mapWithKey = map.convert({ cap: false });

// const argv = {
//  accessToken: "foo",
//  nameIdentifier: "ahm",
//  organization: "ahmdigital"
// };

const hasNameIdentifier = includes(argv.nameIdentifier);

const query = `
  query {
    organization(login: "${argv.organization}") {
      repositories(first: 100) {
        nodes {
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

const getListOfPackageObjects = compose(
  map(JSON.parse),
  compact,
  map("content.text"),
  reject("isArchived"),
  get("data.organization.repositories.nodes"),
  JSON.parse
);

const getDependencyRelationship = packageJson => (_version, dependency) => ({
  dependency,
  package: packageJson.name,
  isDev: includes(dependency)(keys(packageJson.devDependencies))
});

const getDependencyRelationshipsForPackageJson = packageJson =>
  mapWithKey(getDependencyRelationship(packageJson), {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  });

const getStringFromDependencyRelationship = ({ dependency, isDev, package }) =>
  `"${dependency}" -> "${package}"${isDev ? ' [style="dashed"]' : ""};`;

const getDotFileBody = compose(
  join("\n"),
  map(getStringFromDependencyRelationship),
  filter(
    ({ dependency, package }) =>
      hasNameIdentifier(dependency) && hasNameIdentifier(package)
  ),
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
    const listOfPackageObjects = getListOfPackageObjects(body);
    const dotFileBody = getDotFileBody(listOfPackageObjects);
    console.log([header, dotFileBody, footer].join("\n"));
  })
  .catch(console.error);
