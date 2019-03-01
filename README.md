# package-graph
Graph your package.json dependencies within your github organisation

## Run

`npm run start -- --accessToken=ffffffffffffffffffffffffffffffffffffffff --organization=ahmdigital`

accessToken is a read-only github access token

organisation is the github organisation's name

# Generate graph
Install graphviz on your platform eg `brew install graphviz`


Put the console output of the npm start into a file `packages.gv` and run something like
`neato -Tsvg ./packages.gv > ./packages.svg`
