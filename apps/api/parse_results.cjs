const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vitest-results.json', 'utf8'));
const failedTests = [];
data.testResults.forEach(file => {
  file.assertionResults.forEach(test => {
    if (test.status === 'failed') {
      failedTests.push({
        file: file.name.replace(/.*__tests__/, '__tests__'),
        name: test.title,
        error: test.failureMessages[0].split('\n')[0]
      });
    }
  });
});
console.log(JSON.stringify(failedTests, null, 2));
