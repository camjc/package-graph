# package-graph
Graph your package.json dependencies within your github organisation

## Run

`npm run start -- --accessToken=ffffffffffffffffffffffffffffffffffffffff --organization=ahmdigital --nameIdentifier=ahm`

accessToken is a read-only github access token

organisation is the github organisation's name

nameIdentifier is a partial match of all the package names on npm

nameIdentifier is optional and will fallback to organization

# Generate graph
Install graphviz on your platform eg `brew install graphviz`


Put the console output of the npm start into a file `packages.gv` and run something like
`neato -Tsvg ./packages.gv > ./packages.svg`
