import fs from 'fs';
import path from 'path';

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.test.js')) files.push(name);
    }
  }
  return files;
}

const files = getFiles('apps/api/src/__tests__');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove Mongoose and MongoMemoryServer imports
  content = content.replace(/import mongoose from 'mongoose';\n/g, '');
  content = content.replace(/import \{ MongoMemoryServer \} from 'mongodb-memory-server';\n/g, '');
  
  // Replace model imports with Prisma
  content = content.replace(/import \{ (.*?) \} from '\.\.\/models\/.*?\.js';\n/g, '');
  
  // Ensure testSetup is imported
  if (!content.includes('testSetup.js') && file !== 'apps/api/src/__tests__/testSetup.js') {
    content = content.replace(/import app from '\.\.\/app\.js';\n/, "import app from '../app.js';\nimport { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';\n");
  }

  // Replace beforeAll setup
  content = content.replace(/let mongoServer;[\s\S]*?beforeAll\(async \(\) => \{[\s\S]*?\}, 60000\);/g, 'beforeAll(async () => {\n  await setupTestDB();\n}, 60000);');
  content = content.replace(/let mongoServer;[\s\S]*?beforeAll\(async \(\) => \{[\s\S]*?\}\);/g, 'beforeAll(async () => {\n  await setupTestDB();\n});');

  // Replace afterAll setup
  content = content.replace(/afterAll\(async \(\) => \{[\s\S]*?await mongoose\.disconnect\(\);[\s\S]*?\}\);/g, 'afterAll(async () => {\n  await teardownTestDB();\n});');

  // Replace beforeEach setup
  content = content.replace(/beforeEach\(async \(\) => \{[\s\S]*?deleteMany\(\{.*?\}\);[\s\S]*?\}\);/g, 'beforeEach(async () => {\n  await cleanCollections();\n});');

  // Replace DB access methods
  content = content.replace(/User\.findOne\(\{ (.*?): (.*?) \}\)/g, 'prisma.user.findFirst({ where: { $1: $2 } })');
  content = content.replace(/User\.findById\((.*?)\)/g, 'prisma.user.findUnique({ where: { id: $1 } })');
  content = content.replace(/Conversation\.findById\((.*?)\)/g, 'prisma.conversation.findUnique({ where: { id: $1 } })');
  content = content.replace(/Message\.find\(\{ (.*?): (.*?) \}\)/g, 'prisma.message.findMany({ where: { $1: $2 } })');
  
  // Replace populate
  content = content.replace(/\.populate\('.*?'\)/g, '');
  
  // Special cases for schema mappings
  content = content.replace(/_id: /g, 'id: ');
  content = content.replace(/\._id/g, '.id');
  content = content.replace(/User\.create\((.*?)\)/g, 'prisma.user.create({ data: $1 })');
  content = content.replace(/new User\((.*?)\)\.save\(\)/g, 'prisma.user.create({ data: $1 })');
  content = content.replace(/await User\.deleteMany\(\{.*?\}\);/g, 'await cleanCollections();');

  fs.writeFileSync(file, content);
  console.log('Migrated', file);
});
