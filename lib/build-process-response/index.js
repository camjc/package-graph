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
const sum = require("lodash/fp/sum");
const uniq = require("lodash/fp/uniq");
const zipAll = require("lodash/fp/zipAll");
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

const getRedInHex = pullRequestCountsByAuthor =>
  Math.min(255, sum(map("count")(pullRequestCountsByAuthor)) * 25).toString(16);

const getLabelFromPackageInformation = ([
  packageName,
  isPrivate,
  pullRequestCountsByAuthor
]) =>
  `"${packageName}" [color="#${getRedInHex(pullRequestCountsByAuthor)}0000", ${
    isPrivate ? "shape=box, " : ""
  }label="${packageName}

  ${getListOfCountStrings(pullRequestCountsByAuthor).join("\n")}"];`;

const getStringFromDependencyRelationship = ({
  dependency,
  isDev,
  packageName
}) => `"${dependency}" -> "${packageName}"${isDev ? ' [style="dashed"]' : ""};`;

const getLabels = compose(
  join("\n"),
  uniq,
  flatten,
  map(getLabelFromPackageInformation),
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

  const listOfIsPrivate = map("isPrivate")(unarchivedNodes);
  const listOfPackageNames = map("name")(listOfPackageObjects);
  const labels = getLabels(
    zipAll([
      listOfPackageNames,
      listOfIsPrivate,
      listOfPullRequestCountsByAuthor
    ])
  );

  const output = [header, edges, labels, footer].join("\n");

  console.log(output);
  return output;
};

module.exports = buildProcessResponse;
