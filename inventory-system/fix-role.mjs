import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.updateMany({ where: { username: 'admin' }, data: { role: 'ADMIN' } })
    .then(r => console.log('Updated:', r.count))
    .finally(() => p.$disconnect());
