const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Downloading vitrina_latest.tar.gz...');
    sftp.fastGet('/home/ubuntu/vitrina_latest.tar.gz', '../vitrina_latest.tar.gz', (err) => {
      if (err) throw err;
      console.log('Download complete.');
      conn.end();
    });
  });
}).connect({
  host: '185.146.1.97',
  port: 22,
  username: 'ubuntu',
  password: '@fqTeedmttbzhujkg6oi'
});
