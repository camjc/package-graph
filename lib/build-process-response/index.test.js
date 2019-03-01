const buildProcessResponse = require(".");

it("maps to graphviz dot format", () => {
  const body = JSON.stringify({
    data: {
      organization: {
        repositories: {
          nodes: [
            {
              content: {
                text: undefined
              },
              isArchived: false,
              isPrivate: true
            },
            {
              content: {
                text: JSON.stringify({
                  name: "ahm-partner-sales",
                  dependencies: {
                    "@ahmdigital/ui": "1.0.0",
                    lodash: "4.0.0"
                  }
                })
              },
              isArchived: true,
              isPrivate: true
            },
            {
              content: {
                text: JSON.stringify({
                  name: "ahm-sales",
                  dependencies: {
                    "@ahmdigital/ui": "1.0.0",
                    lodash: "4.0.0"
                  }
                })
              },
              isArchived: false,
              isPrivate: true,
              pullRequests: {
                nodes: [
                  {
                    author: {
                      login: "camjc"
                    }
                  },
                  {
                    author: {
                      login: "renovate"
                    }
                  },
                  {
                    author: {
                      login: "renovate"
                    }
                  }
                ]
              }
            },
            {
              content: {
                text: JSON.stringify({
                  name: "ahm-members",
                  dependencies: {
                    "@ahmdigital/ui": "1.0.0",
                    "@ahmdigital/constants": "2.0.0"
                  },
                  devDependencies: { "@ahmdigital/eslint-config": "4.0.0" }
                })
              },
              isArchived: false,
              isPrivate: false
            }
          ]
        }
      }
    }
  });
  const processResponse = buildProcessResponse("ahmdigital");
  expect(processResponse(body)).toMatchSnapshot();
});
