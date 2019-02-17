# package-graph
Graph your package.json dependencies within your github organisation

## Run

`npm run start -- --accessToken=ffffffffffffffffffffffffffffffffffffffff --organization=ahmdigital --nameIdentifier=ahm`

accessToken is a read-only github access token

organisation is the github organisation's name

nameIdentifier is a partial match of all the package names on npm

nameIdentifier is optional and will fallback to organization
