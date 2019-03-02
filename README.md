# package-graph
Graph your package.json dependencies within your github organisation

## Run

`npm run start -- --accessToken=ffffffffffffffffffffffffffffffffffffffff --organization=ahmdigital`

accessToken is a read-only github access token

organisation is the github organisation's name

## Generate graph
Install graphviz on your platform eg `brew install graphviz`


Put the console output of the npm start into a file `packages.gv` and run something like
`neato -Tsvg ./packages.gv > ./packages.svg`

## Example

`airbnb` organization

![screen shot 2019-03-02 at 18 54 07-fullpage](https://user-images.githubusercontent.com/4197647/53679140-b36aa480-3d1c-11e9-9f52-5a79aa03b716.png)
