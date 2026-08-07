const fs = require('fs');
let content = fs.readFileSync('apps/api/src/__tests__/messageOperations.test.js', 'utf8');

if (!content.includes('createTestUser')) {
  content = content.replace(/import \{ setupTestDB, teardownTestDB, cleanCollections, prisma \} from '\.\/testSetup\.js';/, "import { setupTestDB, teardownTestDB, cleanCollections, prisma, createTestUser } from './testSetup.js';");
}

content = content.replace(/user1 = await prisma\.user\.create\(\{\s*data: \{\s*username: 'user1',\s*email: 'user1@example\.com',\s*passwordHash: 'hashed1',\s*isEmailVerified: true,\s*\} \}\);\r?\n\s*token1 = generateAccessToken\(user1\);/, 'const u1 = await createTestUser(); user1 = u1.user; token1 = u1.token;');
content = content.replace(/user2 = await prisma\.user\.create\(\{\s*data: \{\s*username: 'user2',\s*email: 'user2@example\.com',\s*passwordHash: 'hashed2',\s*isEmailVerified: true,\s*\} \}\);\r?\n\s*token2 = generateAccessToken\(user2\);/, 'const u2 = await createTestUser(); user2 = u2.user; token2 = u2.token;');
content = content.replace(/user3 = await prisma\.user\.create\(\{\s*data: \{\s*username: 'user3',\s*email: 'user3@example\.com',\s*passwordHash: 'hashed3',\s*isEmailVerified: true,\s*\} \}\);\r?\n\s*token3 = generateAccessToken\(user3\);/, 'const u3 = await createTestUser(); user3 = u3.user; token3 = u3.token;');

fs.writeFileSync('apps/api/src/__tests__/messageOperations.test.js', content);
console.log('Fixed users in messageOperations.test.js');
