const fs = require('fs');

let test1 = fs.readFileSync('apps/api/src/__tests__/messageOperations.test.js', 'utf8');

// Fix deletedBy logic
test1 = test1.replace(/dbMsg\.deletedBy\.toString\(\) \!== user1\.id\.toString\(\)/g, 'dbMsg.audit && dbMsg.audit.deletedById !== user1.id');
test1 = test1.replace(/expect\(dbMsg\.deletedBy\.map\(\(id\) => id\.toString\(\)\)\)\.toContain\(user1\.id\.toString\(\)\);/g, 'expect(dbMsg.audit?.deletedById).toBe(user1.id);');

// Fix pinnedBy logic
test1 = test1.replace(/expect\(dbMsg\.pinnedBy\.toString\(\)\)\.toBe\(user2\.id\.toString\(\)\);/g, 'expect(dbMsg.pinnedById).toBe(user2.id);');
test1 = test1.replace(/expect\(dbMsg\.pinnedBy\.toString\(\)\)\.toBe\(user1\.id\.toString\(\)\);/g, 'expect(dbMsg.pinnedById).toBe(user1.id);');
test1 = test1.replace(/pinnedBy: user2\.id/g, 'pinnedById: user2.id');
test1 = test1.replace(/pinnedBy: user1\.id/g, 'pinnedById: user1.id');
test1 = test1.replace(/expect\(dbMsg\.pinnedBy\.toString\(\)\)\.toBe\(dbMsg\.pinnedBy\.toString\(\)\);/g, '');

// Fix reactions logic
test1 = test1.replace(/const dbMsg = await prisma\.message\.findUnique\(\{ where: \{ id: message\.id \} \}\);/g, 'const dbMsg = await prisma.message.findUnique({ where: { id: message.id }, include: { reactions: true } });');
test1 = test1.replace(/expect\(dbMsg\.reactions\[0\]\.userId\.toString\(\)\)\.toBe\(user2\.id\.toString\(\)\);/g, 'expect(dbMsg.reactions[0].userId).toBe(user2.id);');
test1 = test1.replace(/expect\(dbMsg\.reactions\[0\]\.userId\.toString\(\)\)\.toBe\(user1\.id\.toString\(\)\);/g, 'expect(dbMsg.reactions[0].userId).toBe(user1.id);');
test1 = test1.replace(/reactions: \[\s*\{\s*emoji: '👍',\s*userId: user2\.id\s*\}\s*\]/g, "reactions: { create: [{ emoji: '👍', userId: user2.id }] }");

// Forwarded logic
test1 = test1.replace(/expect\(res\.body\.data\.message\.forwardedFrom\)\.toBe\(message\.id\.toString\(\)\);/g, 'expect(res.body.data.message.forwardedFromId || res.body.data.message.forwardedFrom).toBe(message.id);');

fs.writeFileSync('apps/api/src/__tests__/messageOperations.test.js', test1);

let test2 = fs.readFileSync('apps/api/src/__tests__/receipt.test.js', 'utf8');

// Fix receipt findUnique missing includes
test2 = test2.replace(/const updatedConv = await prisma\.conversation\.findUnique\(\{ where: \{ id: conversation\.id \} \}\);/g, 'const updatedConv = await prisma.conversation.findUnique({ where: { id: conversation.id }, include: { members: true } });');

fs.writeFileSync('apps/api/src/__tests__/receipt.test.js', test2);

console.log('Fixed messageOperations.test.js and receipt.test.js');
