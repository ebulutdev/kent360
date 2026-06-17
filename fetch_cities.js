const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function main() {
  try {
    const response = await fetch('https://turkiyeapi.dev/api/v1/provinces');
    const json = await response.json();
    
    const citiesMap = {};
    const provinces = json.data;
    
    for (const province of provinces) {
      const cityName = province.name;
      const districts = province.districts.map(d => d.name);
      citiesMap[cityName] = districts.sort((a, b) => a.localeCompare(b, 'tr'));
    }

    fs.writeFileSync(path.join(DATA_DIR, 'cities.json'), JSON.stringify(citiesMap, null, 2), 'utf8');
    console.log('cities.json created successfully.');
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
