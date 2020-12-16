const http = require("http");
const { URL } = require("url");
const path = require("path");
const fs = require("fs").promises;
class Server {
  constructor(options) {
    this.port = options.port;
    this.directory = options.directory;
  }
  handleRequest(req, res) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    // console.log(urlObj);
    const filePath = path.join(
      this.directory,
      urlObj.pathname === "/" ? "public/template.html" : urlObj.pathname
    );
    console.log(filePath);
    this.sendFile(res, filePath);
  }
  async sendFile(res, filePath) {
    const statObj = await fs.stat(filePath);
    if (statObj.isFile()) {
      const content = await fs.readFile(filePath);
      res.end(content);
    }
  }

  start() {
    const server = http.createServer(this.handleRequest.bind(this));
    server.listen(this.port, () => {
      console.log(`server is running on ${this.port}`);
    });
  }
}

module.exports = Server;
