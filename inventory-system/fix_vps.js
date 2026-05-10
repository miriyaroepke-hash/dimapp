const { Client } = require('ssh2');

const conn = new Client();

const runCommand = (cmd) => new Promise((resolve, reject) => {
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let out = '';
    stream.on('close', (code, signal) => {
      resolve({ code, out });
    }).on('data', (data) => {
      out += data.toString();
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      out += data.toString();
      process.stderr.write(data);
    });
  });
});

conn.on('ready', async () => {
  console.log('Client :: ready');
  try {
    console.log('Fixing the pathing and building the actual updated app...');
    await runCommand(`
      cd /home/ubuntu/inventory-system
      
      # Copy the .env down to the actual app folder
      cp .env inventory-system/.env
      
      cd inventory-system
      
      echo "Running NPM Install..."
      npm install
      
      echo "Pushing DB schema..."
      npx prisma db push
      
      echo "Building Next.js Admin App..."
      npm run build
      
      echo "Restarting PM2 process..."
      # Delete old process mapped to wrong folder
      pm2 delete inventory-system || true
      
      # Start new process in the correct folder on port 3000
      PORT=3000 pm2 start npm --name "inventory-system" -- run start
      
      pm2 save
    `);
    console.log('SUCCESS!');
  } catch (err) {
    console.error('Error:', err);
  }
  conn.end();
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '185.146.1.97',
  port: 22,
  username: 'ubuntu',
  password: '@fqTeedmttbzhujkg6oi'
});
