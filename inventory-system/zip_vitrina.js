const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('cd /home/ubuntu/vitrina && zip -r ../vitrina_latest.zip . -x "node_modules/*" -x ".next/*"', (err, stream) => { 
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => conn.end()); 
    }); 
}).connect({host: '185.146.1.97', port: 22, username: 'ubuntu', password: '@fqTeedmttbzhujkg6oi'});
