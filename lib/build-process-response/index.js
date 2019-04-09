const compose = require("lodash/fp/compose");
const countBy = require("lodash/fp/countBy");
const filter = require("lodash/fp/filter");
const flatten = require("lodash/fp/flatten");
const fromPairs = require("lodash/fp/fromPairs");
const get = require("lodash/fp/get");
const includes = require("lodash/fp/includes");
const isEmpty = require("lodash/fp/isEmpty");
const isString = require("lodash/fp/isString");
const join = require("lodash/fp/join");
const keys = require("lodash/fp/keys");
const map = require("lodash/fp/map");
const orderBy = require("lodash/fp/orderBy");
const pickBy = require("lodash/fp/pickBy");
const reject = require("lodash/fp/reject");
const replace = require("lodash/fp/replace");
const semver = require("semver");
const sum = require("lodash/fp/sum");
const uniq = require("lodash/fp/uniq");
const zipAll = require("lodash/fp/zipAll");
const mapWithKey = map.convert({ cap: false });

const attributesToString = attributes => {
  const cleanedAttributes = pickBy(isString)(attributes);
  if (isEmpty(cleanedAttributes)) {
    return "";
  }
  return (
    " [ " +
    mapWithKey((value, key) => key + '="' + value + '"')(cleanedAttributes) +
    " ];"
  );
};

const getDependencyRelationship = ({ packageJson }) => (
  version,
  dependency
) => ({
  dependency,
  isDev: includes(dependency)(keys(packageJson.devDependencies)),
  packageName: packageJson.name,
  version
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
  packageVersion,
  isPrivate,
  pullRequestCountsByAuthor,
  repositoryUrl
]) => {
  const attributes = {
    href: repositoryUrl + "/pulls",
    color: `#${getRedInHex(pullRequestCountsByAuthor)}0000`,
    label:
      packageName +
      `${packageVersion ? "\n" + packageVersion : ""}` +
      "\n" +
      getListOfCountStrings(pullRequestCountsByAuthor).join("\n"),
    shape: isPrivate && "box"
  };
  return `"${packageName}"${attributesToString(attributes)}`;
};

const colorBySemver = {
  major: "red",
  minor: "#880000",
  patch: "#550000",
  null: "black"
};

const buildGetStringFromDependencyRelationship = packageVersionsByName => ({
  dependency,
  isDev,
  packageName,
  version
}) => {
  let versionDiff;
  try {
    versionDiff = semver.diff(
      packageVersionsByName[dependency],
      replace("^", "")(version)
    );
  } catch (error) {}

  const attributes = {
    color: colorBySemver[versionDiff],
    style: isDev && "dashed",
  };

  return `"${dependency}" -> "${packageName}"${attributesToString(attributes)}`;
};

const getLabels = compose(
  join("\n"),
  uniq,
  flatten,
  map(getLabelFromPackageInformation),
  filter(([packageName]) => packageName)
);

const buildGetEdges = ({ organization, packageVersionsByName }) =>
  compose(
    join("\n"),
    uniq,
    flatten,
    map(buildGetStringFromDependencyRelationship(packageVersionsByName)),
    filter(({ dependency }) => includes(organization)(dependency) || dependency === 'lodash'),
    flatten,
    map(getDependencyRelationshipsForPackageJson)
  );

const fontAttributes = { fontname: "gill sans" };
const header = `
digraph {
  overlap=scalexy;
  splines=true;
  layout=neato;
  graph${attributesToString(fontAttributes)}
  node${attributesToString(fontAttributes)}
  edge${attributesToString(fontAttributes)}
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

  const listOfPackageNames = map("name")(listOfPackageObjects);
  const listOfPackageVersions = map("version")(listOfPackageObjects);
  const listOfIsPrivate = map("isPrivate")(unarchivedNodes);
  const listOfPullRequestCountsByAuthor = getListOfPullRequestCountsByAuthor(
    unarchivedNodes
  );
  const listOfRepositoryUrls = map("url")(unarchivedNodes);

  const labels = getLabels(
    zipAll([
      listOfPackageNames,
      listOfPackageVersions,
      listOfIsPrivate,
      listOfPullRequestCountsByAuthor,
      listOfRepositoryUrls
    ])
  );

  const edges = buildGetEdges({
    organization,
    packageVersionsByName: fromPairs(
      zipAll([listOfPackageNames, listOfPackageVersions])
    )
  })(listOfPackageObjects);

  const output = [header, edges, labels, footer].join("\n");

  return output;
};

module.exports = buildProcessResponse;
