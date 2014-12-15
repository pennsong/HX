var http = require("http");
http.createServer(function(request, response) {
    console.log(request);
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello World" + request.length);
    response.end();
}).listen(8888);