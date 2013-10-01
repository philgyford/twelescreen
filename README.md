# Twelescreen

## TO DO

* Put jQuery and underscore into bower_components?

Work in progress.

Originally based on this example, and gradually moving away from that:
http://www.dillonbuchanan.com/programming/node-js-twitter-streaming-api-socket-io-twitter-cashtag-heatmap/

Notes for myself about all this stuff:

Run the server with `node app.js`.


### NVM

You can use https://github.com/creationix/nvm to install and manage different versions of Node.


### NPM

Managing the server-side components. These are listed in `package.json` and get installed in `node_modules/`.

Install NPM. https://github.com/isaacs/npm


### Bower

To manage front-end components. These are listed in `bower.json` and get installed in `bower_components/`.

Install bower https://github.com/bower/bower with `npm install -g bower`

Then do something like this to install new ones: `bower install socket.io-client`.

Add the `--save` flag to add them to `component.json`: `bower install socket.io-client --save`.

Install all required components needed with `bower install`.


