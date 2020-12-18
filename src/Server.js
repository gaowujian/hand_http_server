const http = require("http");
const { URL } = require("url");
const path = require("path");
const fs = require("fs").promises;
const ejs = require("ejs");
const mime = require("Mime");
class Server {
  constructor(options) {
    this.port = options.port;
    this.directory = options.directory || process.cwd();
  }
  async handleRequest(req, res) {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      // 这里拼接的是requestUrl, 由dir地址和路径名拼接而成
      urlObj.pathname = decodeURIComponent(urlObj.pathname); // decode 解码

      const requestUrl = path.join(this.directory, urlObj.pathname);
      const stateObj = await fs.stat(requestUrl);
      // 如果是文件的话，requestUrl就是本地的文件路径
      if (stateObj.isFile()) {
        this.sendFile(res, requestUrl);
      } else {
        // 如果是目录的话需要去渲染一个列表，这个时候requestUrl就是本地的目录路径
        // 我们还需要去把当前的路径地址传进去，用于目录下链接的导航
        this.renderDirectory(res, requestUrl, urlObj.pathname);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async renderDirectory(res, directoryPath, pathname) {
    const children = await fs.readdir(directoryPath);
    const dirs = children.map((item) => ({
      label: item,
      link: path.join(pathname, item),
    }));

    const content = await ejs.renderFile(
      path.resolve(__dirname, "template.html"),
      {
        dirs,
        title: "mock data",
      }
    );
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(content);
  }

  async sendFile(res, filePath) {
    const content = await fs.readFile(filePath);
    // 根据文件后缀设置相应的content-type
    const lastDodIndex = String(filePath).lastIndexOf(".");
    const ext = filePath.slice(lastDodIndex);
    res.setHeader("Content-Type", `${mime.getType(ext)};charset=utf-8`);
    res.end(content);
  }

  start() {
    const server = http.createServer(this.handleRequest.bind(this));
    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        const anotherServer = new Server({ port: ++this.port });
        console.log("anotherServer.port:", anotherServer.port);
        console.log("anotherServer.directory:", anotherServer.directory);
        anotherServer.start();
      }
    });
    server.listen(this.port, () => {
      console.log(`server is running on ${this.port}`);
    });
  }
}

module.exports = Server;
