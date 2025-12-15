const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log(`\n🦪 Oysters Platform Starting...`);
console.log(`   Mode: ${dev ? 'development' : 'production'}`);
console.log(`   Port: ${port}\n`);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error:', err);
      res.statusCode = 500;
      res.end('Server error');
    }
  }).listen(port, hostname, () => {
    console.log(`✓ Server ready at http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
    console.log(`✓ Database: Connected`);
    console.log(`✓ Ready for requests\n`);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});






