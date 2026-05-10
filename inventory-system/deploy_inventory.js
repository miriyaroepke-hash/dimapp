const { Client } = require('ssh2');
const conn = new Client();
const run = (cmd) => new Promise((resolve, reject) => {
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let out = '';
    stream.on('close', () => resolve(out))
      .on('data', (d) => { out += d; process.stdout.write(d); })
      .stderr.on('data', (d) => { out += d; process.stderr.write(d); });
  });
});

conn.on('ready', () => {
  console.log('Uploading inventory.zip...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(
      'C:/Users/amone/.gemini/antigravity/playground/zonal-kepler/inventory_new.zip',
      '/home/ubuntu/inventory_new.zip',
      async (err) => {
        if (err) throw err;
        console.log('Upload done! Building...');
        try {
          await run(`
            cd /home/ubuntu
            sudo chown ubuntu:ubuntu inventory_new.zip
            rm -rf inventory_new_tmp
            mkdir inventory_new_tmp
            cd inventory_new_tmp
            unzip -q ../inventory_new.zip
            sudo chown -R ubuntu:ubuntu .
            sudo chmod -R 755 .
            cp /home/ubuntu/inventory-system/.env . 2>/dev/null || true
            npm install
            npm run build
          `);
          await run(`
            pm2 stop inventory-system || true
            cd /home/ubuntu
            rm -rf inventory-system_old
            mv inventory-system inventory-system_old || true
            mv inventory_new_tmp inventory-system
            rm -f inventory_new.zip
            cd inventory-system
            pm2 delete inventory-system || true
            PORT=3000 pm2 start npm --name "inventory-system" -- run start
            pm2 save
          `);
          await run('pm2 list');
          console.log('DONE!');
        } catch(e) { console.error('Error:', e); }
        conn.end();
      }
    );
  });
}).connect({ host: '185.146.1.97', port: 22, username: 'ubuntu', password: '@fqTeedmttbzhujkg6oi' });
