const config = {
  port: {
    flags: "-p, --port <port_number>",
    description: "set port for server",
    defaultValue: 8000,
    usage: "tony_server -p 3000",
  },
  directory: {
    flags: "-d, --directory <directory>",
    description: "set directory for server",
    defaultValue: process.cwd(),
    usage: "tony_server -d ~/",
  },
};

module.exports = config;
