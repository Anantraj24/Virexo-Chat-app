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

  // Add cleanCollections if not present in beforeEach
  if (!content.includes('await cleanCollections();') || content.match(/beforeEach\(async \(\) => \{\r?\n(\s*)\n/)) {
    // some might have empty beforeEach
    content = content.replace(/beforeEach\(async \(\) => \{/g, 'beforeEach(async () => {\n    await cleanCollections();');
  }

  fs.writeFileSync(file, content);
  console.log('Fixed beforeEach in', file);
});
