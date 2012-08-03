(function () {
  var fs = __meteor_bootstrap__.require('fs');
  var spawn = __meteor_bootstrap__.require('child_process').spawn;
  var querystring = __meteor_bootstrap__.require('querystring');
  var app = __meteor_bootstrap__.app;

  app.use(function (req, res, next) {
    if (/\?.*_escaped_fragment_=/.test(req.url)) {
      // get escaped fragment out of the url. Gross!
      var preQuery = req.url.split("?")[0];
      var queryStr = req.url.split("?")[1];
      var parsed = querystring.parse(queryStr);
      delete parsed['_escaped_fragment_'];
      var newQuery = querystring.stringify(parsed);
      var newPath = preQuery + (newQuery ? "?" + newQuery : "");
      var url = "http://" + req.headers.host + newPath;
      console.log("GB", url);

      // run phantomjs
      var tmpfile = "/tmp/" +
            (((1+Math.random())*0x1000000)|0).toString(16) + ".js";
      fs.writeFile(
        tmpfile,
        "var url = '" + url + "';" +
"var page = require('webpage').create();" +

"page.open(url);" +

"var lastContent;" +
"var settledCount = 0;" +
"var count = 0;" +

"setInterval(function() {" +
"  var connected = page.evaluate(function () {" +
"    return typeof Meteor !== 'undefined' && Meteor.status().connected;" +
"  });" +
"  if (!connected || page.content !== lastContent) {" +
"    settledCount = 0;" +
"    lastContent = page.content;" +
"  } else {" +
"    settledCount += 1;" +
"  }" +

"  if (settledCount >= 3 || count >= 100) {" +
"    var out = page.content;" +
"    out = out.replace(/<script[^>]+>(.|\\n|\\r)*?<\\/script\\s*>/ig, '');" +
"    out = out.replace('<meta name=\"fragment\" content=\"!\">', '');" +

"    console.log(out);" +
"    phantom.exit();" +
"  }" +
"}, 100);",
        function (err) {
          if (err) { // can't write file?
            next();
            return;
          }
          // XXX make sure phantomjs in the path!
          var cp = spawn('phantomjs', ['--load-images=no', tmpfile]);
          cp.on('exit', function (code) {
            // XXX look at code
            res.end();
            fs.unlink(tmpfile);
          });
          // phantomjs prints in utf8.
          res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});

          cp.stdout.pipe(res);
        });
    } else {
      next();
    }
  });
})();
