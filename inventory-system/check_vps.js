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
  console.log('Uploading...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(
      'C:/Users/amone/.gemini/antigravity/playground/vitrina.zip',
      '/home/ubuntu/vitrina_new.zip',
      async (err) => {
        if (err) throw err;
        console.log('Upload done! Building...');
        try {
          await run(`
            cd /home/ubuntu
            sudo chown ubuntu:ubuntu vitrina_new.zip
            rm -rf vitrina_new_tmp
            mkdir vitrina_new_tmp
            cd vitrina_new_tmp
            unzip -q ../vitrina_new.zip
            sudo chown -R ubuntu:ubuntu .
            sudo chmod -R 755 .
            cp /home/ubuntu/vitrina/.env . 2>/dev/null || true
            npm install
            npm run build
          `);
          await run(`
            pm2 stop vitrina || true
            cd /home/ubuntu
            rm -rf vitrina_old
            mv vitrina vitrina_old || true
            mv vitrina_new_tmp vitrina
            rm -f vitrina_new.zip
            cd vitrina
            pm2 restart vitrina || PORT=3001 pm2 start npm --name "vitrina" -- run start
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
