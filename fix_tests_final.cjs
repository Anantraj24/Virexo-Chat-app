const fs = require('fs');

const files = [
  'apps/api/src/__tests__/admin.test.js',
  'apps/api/src/__tests__/conversation.test.js',
  'apps/api/src/__tests__/message.test.js',
  'apps/api/src/__tests__/messageOperations.test.js',
  'apps/api/src/__tests__/receipt.test.js',
  'apps/api/src/__tests__/socket.test.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Clean up old mongoose imports
  content = content.replace(/import mongoose from 'mongoose';\r?\n/g, '');
  content = content.replace(/import \{ MongoMemoryServer \} from 'mongodb-memory-server';\r?\n/g, '');
  content = content.replace(/import \{ (.*?) \} from '\.\.\/models\/.*?\.js';\r?\n/g, '');
  
  // Add testSetup imports
  if (!content.includes('testSetup.js')) {
    const importStatement = "import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';\n";
    if (content.includes("import app from '../app.js';")) {
        content = content.replace(/import app from '\.\.\/app\.js';\r?\n/, "import app from '../app.js';\n" + importStatement);
    } else {
        content = content.replace(/import \{.*?\} from 'vitest';\r?\n/, match => match + importStatement);
    }
  }

  // Manually replace mongoServer setup block with just setupTestDB
  content = content.replace(/let mongoServer;\r?\n\r?\n\s*beforeAll\(async \(\) => \{\r?\n\s*mongoServer = await MongoMemoryServer\.create\(\);\r?\n\s*const uri = mongoServer\.getUri\(\);\r?\n\s*await mongoose\.connect\(uri\);\r?\n\r?\n\s*\/\/ Clear collections\r?\n\s*(await [A-Za-z]+\.deleteMany\(\{.*?\}\);\r?\n\s*)+\r?\n/g, 'beforeAll(async () => {\n  await setupTestDB();\n  await cleanCollections();\n\n');
  
  content = content.replace(/let mongoServer;\r?\n\s*beforeAll\(async \(\) => \{\r?\n\s*mongoServer = await MongoMemoryServer\.create\(\);\r?\n\s*const uri = mongoServer\.getUri\(\);\r?\n\s*await mongoose\.connect\(uri\);\r?\n\r?\n/g, 'beforeAll(async () => {\n  await setupTestDB();\n\n');

  // Also replace cases where deleteMany is inside beforeAll
  content = content.replace(/mongoServer = await MongoMemoryServer\.create\(\);\r?\n\s*const uri = mongoServer\.getUri\(\);\r?\n\s*await mongoose\.connect\(uri\);/g, 'await setupTestDB();\n    await cleanCollections();');
  content = content.replace(/let mongoServer;/g, '');

  content = content.replace(/afterAll\(async \(\) => \{\r?\n\s*await mongoose\.disconnect\(\);\r?\n\s*if \(mongoServer\) \{\r?\n\s*await mongoServer\.stop\(\);\r?\n\s*\}\r?\n\s*\}\);/g, 'afterAll(async () => {\n  await teardownTestDB();\n});');

  content = content.replace(/beforeEach\(async \(\) => \{\r?\n\s*(await [A-Za-z]+\.deleteMany\(\{.*?\}\);\r?\n\s*)+\}\);/g, 'beforeEach(async () => {\n  await cleanCollections();\n});');

  // Fix deleteMany when it's manually specified
  content = content.replace(/await User\.deleteMany\(\{\}\);/g, 'await cleanCollections();');
  content = content.replace(/await Report\.deleteMany\(\{\}\);/g, '');
  content = content.replace(/await Conversation\.deleteMany\(\{\}\);/g, '');
  content = content.replace(/await Message\.deleteMany\(\{\}\);/g, '');
  content = content.replace(/await Receipt\.deleteMany\(\{\}\);/g, '');
  
  // Fix method calls using generic capture
  content = content.replace(/User\.create\(([\s\S]*?)\)/g, 'prisma.user.create({ data: $1 })');
  content = content.replace(/Conversation\.create\(([\s\S]*?)\)/g, 'prisma.conversation.create({ data: $1 })');
  content = content.replace(/Message\.create\(([\s\S]*?)\)/g, 'prisma.message.create({ data: $1 })');
  content = content.replace(/Report\.create\(([\s\S]*?)\)/g, 'prisma.report.create({ data: $1 })');
  content = content.replace(/Receipt\.create\(([\s\S]*?)\)/g, 'prisma.receipt.create({ data: $1 })');
  content = content.replace(/Notification\.create\(([\s\S]*?)\)/g, 'prisma.notification.create({ data: $1 })');
  
  content = content.replace(/User\.findById\((.*?)\)/g, 'prisma.user.findUnique({ where: { id: $1 } })');
  content = content.replace(/Conversation\.findById\((.*?)\)/g, 'prisma.conversation.findUnique({ where: { id: $1 } })');
  content = content.replace(/Message\.findById\((.*?)\)/g, 'prisma.message.findUnique({ where: { id: $1 } })');
  content = content.replace(/Report\.findById\((.*?)\)/g, 'prisma.report.findUnique({ where: { id: $1 } })');
  
  content = content.replace(/Conversation\.findByIdAndUpdate\((.*?), ([\s\S]*?)\)/g, 'prisma.conversation.update({ where: { id: $1 }, data: $2 })');
  content = content.replace(/Message\.findByIdAndUpdate\((.*?), ([\s\S]*?)\)/g, 'prisma.message.update({ where: { id: $1 }, data: $2 })');
  
  content = content.replace(/User\.findOne\(\{ (.*?) \}\)/g, 'prisma.user.findFirst({ where: { $1 } })');
  content = content.replace(/User\.find\(\{ (.*?) \}\)/g, 'prisma.user.findMany({ where: { $1 } })');
  content = content.replace(/Message\.find\(\{ (.*?) \}\)/g, 'prisma.message.findMany({ where: { $1 } })');
  content = content.replace(/Receipt\.find\(\{ (.*?) \}\)/g, 'prisma.receipt.findMany({ where: { $1 } })');
  
  content = content.replace(/_id: /g, 'id: ');
  content = content.replace(/\._id/g, '.id');
  
  fs.writeFileSync(file, content);
  console.log('Migrated', file);
});
