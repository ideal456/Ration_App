const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

/**
 * Helper function to parse a single UP NFSA HTML file.
 * @param {string} fileName - Name of the file inside the backend directory
 * @param {string} cardType - The type tag ('PHH' or 'AAY')
 * @returns {Array} Array of parsed card objects
 */
function parseSingleFile(fileName, cardType) {
    const filePath = path.join(__dirname, fileName);
    const cardArray = [];

    // Safety Check: If the file hasn't been saved yet, skip it instead of crashing the server
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: ${fileName} was not found in the backend folder. Skipping...`);
        return [];
    }

    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(htmlContent);

    // Loop through each table row on the saved government page
    $('table tr').each((index, element) => {
        const cells = $(element).find('td');
        
        // Ensure the row represents a data row by validating the column length
        if (cells.length >= 6) {
            const serialNo = $(cells[0]).text().trim();
            
            // Check that the first cell is a valid row serial number
            if (!isNaN(serialNo) && serialNo !== '') {
                const cardNumber = $(cells[1]).text().trim();
                const holderName = $(cells[2]).text().trim();
                const totalUnits = parseInt($(cells[5]).text().trim(), 10);

                cardArray.push({
                    number: cardNumber,
                    name: holderName,
                    members: totalUnits,
                    type: cardType, // Adds 'PHH' or 'AAY' dynamically depending on the source file
                    received: false,
                    fingerScanned: false
                });
            }
        }
    });

    console.log(`🔹 Parsed ${cardArray.length} records from ${fileName} [Type: ${cardType}]`);
    return cardArray;
}

/**
 * Main parser engine that combines multiple ration dataset layers
 */
function parseAllRationData() {
    try {
        // Parse both structural layers independently
        const phhCards = parseSingleFile('phh_data.html', 'PHH');
        const aayCards = parseSingleFile('aay_data.html', 'AAY');

        // Merge both arrays into one master collection
        const totalMasterList = [...phhCards, ...aayCards];
        
        console.log(`✅ Success! Combined total of ${totalMasterList.length} unified records.`);
        return totalMasterList;

    } catch (error) {
        console.error('Error combining dataset streams:', error);
        return [];
    }
}

// Auto-run if executed directly via terminal
if (require.main === module) {
    parseAllRationData();
}

module.exports = parseAllRationData;