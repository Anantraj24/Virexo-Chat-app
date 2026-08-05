const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('testSetup.js')) {
    const importStatement = "import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';\n";
    if (content.includes("import app from '../app.js';")) {
        content = content.replace(/import app from '\.\.\/app\.js';\r?\n/, "import app from '../app.js';\n" + importStatement);
    } else {
        content = content.replace(/import \{.*?\} from 'vitest';\r?\n/, match => match + importStatement);
    }
  }
  
  content = content.replace(/beforeAll\(async \(\) => \{\r?\n\s*await setupTestDB\(\);\r?\n(?:(?!\}\);).)*?afterAll/s, "beforeAll(async () => {\n  await setupTestDB();\n});\n\nafterAll");

  fs.writeFileSync(file, content);
  console.log('Fixed syntax and imports in', file);
}

fixFile('apps/api/src/__tests__/admin.test.js');
fixFile('apps/api/src/__tests__/conversation.test.js');
fixFile('apps/api/src/__tests__/message.test.js');
fixFile('apps/api/src/__tests__/messageOperations.test.js');
fixFile('apps/api/src/__tests__/receipt.test.js');
fixFile('apps/api/src/__tests__/socket.test.js');
