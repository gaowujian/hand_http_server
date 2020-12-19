const http = require("http");
const { URL } = require("url");
const path = require("path");
const fs = require("fs").promises;
const ejs = require("ejs");
const mime = require("Mime");
const chalk = require("chalk");
const os = require("os");
const crypto = require("crypto");
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
      console.log(requestUrl);
      const stateObj = await fs.stat(requestUrl);
      // 如果是文件的话，requestUrl就是本地的文件路径
      if (stateObj.isFile()) {
        this.sendFile(req, res, stateObj, requestUrl);
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

  async sendFile(req, res, stateObj, filePath) {
    // 根据文件后缀设置相应的content-type
    // const lastDodIndex = String(filePath).lastIndexOf(".");
    // const ext = filePath.slice(lastDodIndex);
    res.setHeader("Content-Type", `${mime.getType(filePath)};charset=utf-8`);

    // 使用强制缓存
    res.setHeader("Cache-Control", "max-age=10");
    res.setHeader("Expires", new Date(Date.now() + 10 * 1000).toUTCString());
    //  使用协商缓存
    const ctime = stateObj.ctime.toUTCString();
    const fileContent = await fs.readFile(filePath);
    const r = crypto.createHash("md5").update(fileContent).digest("base64");
    res.setHeader("Last-Modified", ctime);
    res.setHeader("Etag", r);
    // 每次都会和最新的ctime进行比较
    if (
      (req.headers["if-modified-since"] === ctime) |
      (req.headers["if-none-match"] === r)
    ) {
      res.statusCode = 304;
      res.end();
    } else {
      // 在第一次访问资源的时候会走这里
      // fs.createReadStream(filePath).pipe(res);
      const content = await fs.readFile(filePath);
      res.end(content);
    }
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
      console.log(chalk.keyword("orange")("Starting up http-server, serving "));
      console.log(chalk.keyword("orange")("Available on:"));
      console.log(`  http://127.0.0.1:${chalk.green(this.port)}`);
      console.log(
        `  http://${os.networkInterfaces()["en0"][1]["address"]}:${chalk.green(
          this.port
        )}`
      );
      console.log(`server is running on ${this.port}`);
    });
  }
}

module.exports = Server;
