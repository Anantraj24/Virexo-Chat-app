const fs = require('fs');
const files = [
  'apps/api/src/__tests__/conversation.test.js',
  'apps/api/src/__tests__/message.test.js',
  'apps/api/src/__tests__/messageOperations.test.js',
  'apps/api/src/__tests__/notification.test.js',
  'apps/api/src/__tests__/receipt.test.js',
  'apps/api/src/__tests__/socket.test.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace imports
  content = content.replace(/import mongoose from 'mongoose';\n/g, '');
  content = content.replace(/import \{ MongoMemoryServer \} from 'mongodb-memory-server';\n/g, '');
  content = content.replace(/import \{ (.*?) \} from '\.\.\/models\/.*?\.js';\n/g, '');
  if (!content.includes('testSetup.js')) {
    content = content.replace(/import app from '\.\.\/app\.js';\n/, "import app from '../app.js';\nimport { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';\n");
  }

  // Replace mongo setup safely
  content = content.replace(/let mongoServer;\n/g, '');
  content = content.replace(/mongoServer = await MongoMemoryServer\.create\(\);\n\s*const uri = mongoServer\.getUri\(\);\n\s*await mongoose\.connect\(uri\);/g, 'await setupTestDB();');
  content = content.replace(/await mongoose\.disconnect\(\);\n\s*if \(mongoServer\) \{\n\s*await mongoServer\.stop\(\);\n\s*\}/g, 'await teardownTestDB();');

  // Replace deleteMany
  content = content.replace(/await User\.deleteMany\(\{.*?\}\);/g, 'await cleanCollections();');
  content = content.replace(/await (Message|Conversation|Report|Notification)\.deleteMany\(\{.*?\}\);\n?/g, '');

  // Replace create
  content = content.replace(/User\.create\((.*?)\)/g, 'prisma.user.create({ data: $1 })');
  content = content.replace(/Message\.create\((.*?)\)/g, 'prisma.message.create({ data: $1 })');
  content = content.replace(/Conversation\.create\((.*?)\)/g, 'prisma.conversation.create({ data: $1 })');
  content = content.replace(/Notification\.create\((.*?)\)/g, 'prisma.notification.create({ data: $1 })');
  content = content.replace(/Report\.create\((.*?)\)/g, 'prisma.report.create({ data: $1 })');

  // Replace findById
  content = content.replace(/User\.findById\((.*?)\)/g, 'prisma.user.findUnique({ where: { id: $1 } })');
  content = content.replace(/Message\.findById\((.*?)\)/g, 'prisma.message.findUnique({ where: { id: $1 } })');
  content = content.replace(/Conversation\.findById\((.*?)\)/g, 'prisma.conversation.findUnique({ where: { id: $1 } })');

  content = content.replace(/Message\.find\(\{\s*(.*?):\s*(.*?)\s*\}\)/g, 'prisma.message.findMany({ where: { $1: $2 } })');
  content = content.replace(/Notification\.countDocuments\(\{\s*(.*?):\s*(.*?)\s*\}\)/g, 'prisma.notification.count({ where: { $1: $2 } })');
  content = content.replace(/Message\.findByIdAndUpdate\((.*?), (\{.*?\})\)/g, 'prisma.message.update({ where: { id: $1 }, data: $2 })');

  content = content.replace(/_id: /g, 'id: ');
  content = content.replace(/\._id/g, '.id');
  content = content.replace(/\.populate\('.*?'\)/g, '');
  content = content.replace(/\.populate\(\[.*?\]\)/g, '');

  // For socket.test.js, there is setupMongoMemory from a previous migration? No, I restored from git, so it has MongoMemoryServer.

  fs.writeFileSync(file, content);
  console.log('Migrated', file);
});
