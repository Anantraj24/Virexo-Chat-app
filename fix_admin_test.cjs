const fs = require('fs');
let content = fs.readFileSync('apps/api/src/__tests__/admin.test.js', 'utf8');

// Replace imports
content = content.replace(/import mongoose from 'mongoose';\n/g, '');
content = content.replace(/import \{ MongoMemoryServer \} from 'mongodb-memory-server';\n/g, '');
content = content.replace(/import \{ (.*?) \} from '\.\.\/models\/.*?\.js';\n/g, '');
if (!content.includes('testSetup.js')) {
  content = content.replace(/import app from '\.\.\/app\.js';\n/, "import app from '../app.js';\nimport { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';\n");
}

// Replace beforeAll and afterAll carefully
content = content.replace(/let mongoServer;\n\n  beforeAll\(async \(\) => \{\n    mongoServer = await MongoMemoryServer\.create\(\);\n    const uri = mongoServer\.getUri\(\);\n    await mongoose\.connect\(uri\);/g, 'beforeAll(async () => {\n    await setupTestDB();');

content = content.replace(/afterAll\(async \(\) => \{[\s\S]*?await mongoose\.disconnect\(\);[\s\S]*?\}\);/g, 'afterAll(async () => {\n    await teardownTestDB();\n  });');

content = content.replace(/await User\.deleteMany\(\{.*?\}\);/g, 'await cleanCollections();');
content = content.replace(/await Report\.deleteMany\(\{.*?\}\);/g, '');

content = content.replace(/User\.create\((.*?)\)/g, 'prisma.user.create({ data: $1 })');
content = content.replace(/Report\.create\((.*?)\)/g, 'prisma.report.create({ data: $1 })');
content = content.replace(/User\.findById\((.*?)\)/g, 'prisma.user.findUnique({ where: { id: $1 } })');
content = content.replace(/Report\.findById\((.*?)\)/g, 'prisma.report.findUnique({ where: { id: $1 } })');

content = content.replace(/_id: /g, 'id: ');
content = content.replace(/\._id/g, '.id');
content = content.replace(/\.populate\('.*?'\)/g, '');

fs.writeFileSync('apps/api/src/__tests__/admin.test.js', content);
