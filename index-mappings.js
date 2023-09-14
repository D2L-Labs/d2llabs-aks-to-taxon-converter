const fs = require('fs');

const baseFileName = './_sample/AKS-mapping-workbook2023';
const csvData = fs.readFileSync(`${baseFileName}.csv`, { encoding: 'utf-8'});

const arrCsvData = csvData.replaceAll('\r\n', '\n').split('\n');

const mappings = {};
let first = true;
arrCsvData.forEach((value, index) => {
  if (first) {
    first = false;
    return;
  }
  const [code, category, excludeVal] = value.split(',');
  const exclude = (excludeVal) ? true : false;

  // console.log(code, category, exclude);
  if (!mappings[category]) {
    mappings[category] = { prefixes: [], exclusions: []};
  }

  mappings[category].prefixes.push(code);
  
  if (exclude) {
    mappings[category].exclusions.push(code);
  }
})

// combine the new mappings with the old mappings
const originalMappings = require('./_sample/mappings.json');
originalMappings.forEach((obj) => {
  const { group, prefixes, exclusions } = obj;

  if (!mappings[group]) {
    mappings[group] = { prefixes: [], exclusions: []};
  }
  prefixes.forEach((prefix) => mappings[group].prefixes.push(prefix));
  exclusions.forEach((exclusion) => mappings[group].exclusions.push(exclusion));

  mappings[group].prefixes.sort();
  mappings[group].exclusions.sort();
})

const arrOutput = [];
Object.entries(mappings).forEach((entry) => {
  console.log(entry);
  const [group, val] = entry;
  const { prefixes, exclusions } = val;

  console.log({ group, prefixes, exclusions })
  arrOutput.push({ group, prefixes, exclusions });
})

fs.writeFileSync(`${baseFileName}.mappings.json`, JSON.stringify(arrOutput, null, 2), { encoding: 'utf-8'});




