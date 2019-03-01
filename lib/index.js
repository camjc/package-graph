const compose = require("lodash/fp/compose");
const countBy = require("lodash/fp/countBy");
const fetch = require("node-fetch");
const filter = require("lodash/fp/filter");
const flatten = require("lodash/fp/flatten");
const get = require("lodash/fp/get");
const includes = require("lodash/fp/includes");
const join = require("lodash/fp/join");
const keys = require("lodash/fp/keys");
const map = require("lodash/fp/map");
const orderBy = require("lodash/fp/orderBy");
const reject = require("lodash/fp/reject");
const uniq = require("lodash/fp/uniq");
const zip = require("lodash/fp/zip");
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

const getDependencyRelationship = ({ packageJson, pullRequestCountsByAuthor }) => (_version, dependency) => ({
  dependency,
  isDev: includes(dependency)(keys(packageJson.devDependencies)),
  package: packageJson.name,
  pullRequestCountsByAuthor,
});

const getDependencyRelationshipsForPackageJson = ([packageJson, pullRequestCountsByAuthor]) =>
  mapWithKey(getDependencyRelationship({ packageJson, pullRequestCountsByAuthor }), {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  })


const getListOfCountStrings = mapWithKey(({ count, author }) => author + ': ' + count);

const getStringFromDependencyRelationship = ({ dependency, isDev, package, pullRequestCountsByAuthor }) =>
  [`"${dependency}" -> "${package}"${isDev ? ' [style="dashed"]' : ""};`,
  `"${package}" [label="${package}\n${getListOfCountStrings(pullRequestCountsByAuthor).join('\n')}"];`
  ];

const getDotFileBody = compose(
  join("\n"),
  uniq,
  flatten,
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
    const listOfPullRequestCountsByAuthor = compose(
      map(orderBy('count', 'desc')),
      map(mapWithKey((count, author) => ({ count, author }))),
      map(countBy('author.login')),
      map('pullRequests.nodes'),
    )(unarchivedNodes)

    const zippedRepoInfo = zip(listOfPackageObjects, listOfPullRequestCountsByAuthor)

    const dotFileBody = getDotFileBody(zippedRepoInfo);

    console.log([header, dotFileBody, footer].join("\n"));
  })
  .catch(console.error);
