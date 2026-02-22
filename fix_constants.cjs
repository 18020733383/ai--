
const fs = require('fs');
const path = require('path');

const filePath = path.join('c:\\Users\\28600\\Downloads\\ai-领主：卡拉迪亚编年史', 'constants.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add missing fields to locations that only have mercenaries: []
  // We look for mercenaries: [] followed by } (end of object)
  // We replace it with the full set of fields including siegeEngineQueue
  
  const fullBlock = `mercenaries: [],
    owner: 'NEUTRAL',
    isUnderSiege: false,
    siegeProgress: 0,
    siegeEngines: [],
    garrison: [],
    buildings: [],
    constructionQueue: [],
    siegeEngineQueue: [],
    lastIncomeDay: 0
  }`;

  // Regex matches: mercenaries: [] (whitespace) }
  // Note: we need to match the closing brace to replace it correctly with the new block ending with brace
  content = content.replace(/mercenaries: \[\]\s*\}/g, fullBlock);

  // 2. Add siegeEngineQueue to locations that have constructionQueue but miss siegeEngineQueue
  // We replace 'constructionQueue: [],' with 'constructionQueue: [],\n    siegeEngineQueue: [],'
  // Then we fix duplicates if any
  
  content = content.replace(/constructionQueue: \[\],/g, 'constructionQueue: [],\n    siegeEngineQueue: [],');
  
  // Fix duplicates (siegeEngineQueue appearing twice consecutively)
  // Pattern: siegeEngineQueue: [], (whitespace) siegeEngineQueue: [],
  content = content.replace(/siegeEngineQueue: \[\],\s*siegeEngineQueue: \[\],/g, 'siegeEngineQueue: [],');

  // 3. Fix potential trailing comma issues or indentation if needed (basic check)
  // The regex replacement above assumes standard indentation. If mixed, it might look slightly off but valid JS/TS.

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated constants.ts');

} catch (err) {
  console.error('Error processing file:', err);
  process.exit(1);
}
