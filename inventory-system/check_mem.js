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
  try {
    await runCommand('free -m');
  } catch (err) {}
  conn.end();
}).connect({
  host: '185.146.1.97',
  port: 22,
  username: 'ubuntu',
  password: '@fqTeedmttbzhujkg6oi'
});
