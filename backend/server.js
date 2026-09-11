const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

async function start() {
  await connectDB();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Temple Finance API running on port ${port}`);
  });
}

start();
