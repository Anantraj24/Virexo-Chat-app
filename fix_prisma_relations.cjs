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

  // Fix members array in conversation creation
  content = content.replace(/members:\s*\[([\s\S]*?)\]/g, (match, inner) => {
    // Only replace if it looks like objects inside
    if (inner.includes('userId')) {
      return `members: { create: [${inner}] }`;
    }
    return match;
  });

  // Fix user.user.save() to prisma update
  content = content.replace(/user\.user\.accountStatus = '(.*?)';\r?\n\s*await user\.user\.save\(\);/g, "await prisma.user.update({ where: { id: user.user.id }, data: { accountStatus: '$1' } });");
  
  // Also any other .save() calls?
  content = content.replace(/user1\.accountStatus = '(.*?)';\r?\n\s*await user1\.save\(\);/g, "await prisma.user.update({ where: { id: user1.id }, data: { accountStatus: '$1' } });");
  content = content.replace(/user2\.accountStatus = '(.*?)';\r?\n\s*await user2\.save\(\);/g, "await prisma.user.update({ where: { id: user2.id }, data: { accountStatus: '$1' } });");
  
  // Fix message.save() to prisma update if needed
  // For deletedBy, editedAt etc.
  content = content.replace(/message\.deletedBy\.push\((.*?)\);\r?\n\s*await message\.save\(\);/g, "await prisma.message.update({ where: { id: message.id }, data: { deletedBy: { push: $1 } } });");
  content = content.replace(/message\.deletedForEveryone = true;\r?\n\s*await message\.save\(\);/g, "await prisma.message.update({ where: { id: message.id }, data: { deletedForEveryone: true } });");
  
  // Date.now() formatting issues in created objects
  content = content.replace(/Date\.now\(\s+\}\)/g, "Date.now()");

  fs.writeFileSync(file, content);
  console.log('Fixed relations in', file);
});
