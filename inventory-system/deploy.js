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
    console.log('Cloning repo...');
    await runCommand(`
      cd /home/ubuntu
      if [ ! -d "inventory-system/.git" ]; then
        echo "Converting to git repo..."
        cd inventory-system
        git init
        git remote add origin https://github.com/miriyaroepke-hash/dimapp.git
        git fetch origin main
        git reset --hard origin/main
      else
        echo "Git repo exists, pulling..."
        cd inventory-system
        git pull origin main
      fi
      
      echo "Installing and building..."
      npm install
      npx prisma db push
      npm run build
      pm2 restart inventory-system
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
