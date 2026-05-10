const { Client } = require('ssh2');
const fs = require('fs');

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

conn.on('ready', () => {
  console.log('Client :: ready, starting SFTP upload...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const localFile = 'C:/Users/amone/.gemini/antigravity/playground/vitrina.zip';
    const remoteFile = '/home/ubuntu/vitrina.zip';
    
    console.log('Uploading vitrina.zip...');
    sftp.fastPut(localFile, remoteFile, async (err) => {
      if (err) throw err;
      console.log('Upload complete! Beginning extraction and build...');
      try {
        await runCommand(`
          cd /home/ubuntu
          echo "Setting up vitrina_new..."
          rm -rf vitrina_new
          mkdir vitrina_new
          mv vitrina.zip vitrina_new/
          cd vitrina_new
          echo "Unzipping..."
          unzip -q vitrina.zip
          rm vitrina.zip
          
          echo "Copying .env..."
          cp ../vitrina/.env . 2>/dev/null || echo "No .env found in old vitrina"
          
          echo "NPM Install..."
          npm install
          
          echo "Prisma Generates..."
          npx prisma generate || true
          
          echo "Building Next.js..."
          npm run build
          
          echo "Swapping directories and restarting..."
          cd /home/ubuntu
          pm2 delete vitrina || true
          rm -rf vitrina_old
          mv vitrina vitrina_old || true
          mv vitrina_new vitrina
          cd vitrina
          PORT=3003 pm2 start npm --name "vitrina" -- run start
          pm2 save
          echo "VITRINA SUCCESSFULLY DEPLOYED!"
        `);
      } catch (e) {
        console.error('Remote error:', e);
      }
      conn.end();
    });
  });
}).connect({
  host: '185.146.1.97',
  port: 22,
  username: 'ubuntu',
  password: '@fqTeedmttbzhujkg6oi'
});
