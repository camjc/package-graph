const compact = require("lodash/fp/compact");
const compose = require("lodash/fp/compose");
const countBy = require("lodash/fp/countBy");
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
const mapWithKey = map.convert({ cap: false });

const getDependencyRelationship = ({ packageJson }) => (
  _version,
  dependency
) => ({
  dependency,
  isDev: includes(dependency)(keys(packageJson.devDependencies)),
  packageName: packageJson.name
});

const getListOfPackageObjects = compose(
  map(JSON.parse),
  map(textOfPackageJson => textOfPackageJson || JSON.stringify({})),
  map("content.text")
);

const getUnarchivedNodes = compose(
  reject("isArchived"),
  get("data.organization.repositories.nodes"),
  JSON.parse
);

const getDependencyRelationshipsForPackageJson = packageJson =>
  mapWithKey(getDependencyRelationship({ packageJson }), {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  });

const getListOfCountStrings = mapWithKey(
  ({ count, author }) => author + ": " + count
);

const getStringFromPackageInformation = ([
  packageName,
  pullRequestCountsByAuthor
]) =>
  `"${packageName}" [label="${packageName}\n\n${getListOfCountStrings(
    pullRequestCountsByAuthor
  ).join("\n")}"];`;

const getStringFromDependencyRelationship = ({
  dependency,
  isDev,
  packageName
}) => `"${dependency}" -> "${packageName}"${isDev ? ' [style="dashed"]' : ""};`;

const getLabels = compose(
  join("\n"),
  uniq,
  flatten,
  map(getStringFromPackageInformation),
  filter(([packageName]) => packageName)
);

const buildGetEdges = organization =>
  compose(
    join("\n"),
    uniq,
    flatten,
    map(getStringFromDependencyRelationship),
    filter(({ dependency }) => includes(organization)(dependency)),
    flatten,
    map(getDependencyRelationshipsForPackageJson)
  );

const header = `
digraph {
  overlap=scalexy;
  splines=true;
  layout=neato;
`;
const footer = "}";

const getListOfPullRequestCountsByAuthor = compose(
  map(orderBy("count", "desc")),
  map(mapWithKey((count, author) => ({ count, author }))),
  map(countBy("author.login")),
  map("pullRequests.nodes")
);

const buildProcessResponse = organization => body => {
  const unarchivedNodes = getUnarchivedNodes(body);

  const listOfPackageObjects = getListOfPackageObjects(unarchivedNodes);
  const edges = buildGetEdges(organization)(listOfPackageObjects);

  const listOfPullRequestCountsByAuthor = getListOfPullRequestCountsByAuthor(
    unarchivedNodes
  );
  const listOfPackageNames = map("name")(listOfPackageObjects);
  const labels = getLabels(
    zip(listOfPackageNames, listOfPullRequestCountsByAuthor)
  );

  const output = [header, edges, labels, footer].join("\n");

  console.log(output);
  return output;
};

module.exports = buildProcessResponse;
