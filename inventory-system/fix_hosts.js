const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('echo "@fqTeedmttbzhujkg6oi" | sudo -S sh -c "echo \\"192.248.181.165 db.prisma.io\\" >> /etc/hosts"', (err, stream) => { 
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => { 
            conn.exec('pm2 restart inventory-system', (err, stream2) => { 
                stream2.on('data', d => process.stdout.write(d));
                stream2.stderr.on('data', d => process.stderr.write(d));
                stream2.on('close', () => conn.end()); 
            }); 
        }); 
    }); 
}).connect({host: '185.146.1.97', port: 22, username: 'ubuntu', password: '@fqTeedmttbzhujkg6oi'});
