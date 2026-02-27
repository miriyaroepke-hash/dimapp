const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const tokenMatch = env.match(/KASPI_API_TOKEN="?([^"\n]*)"?/);
const KASPI_TOKEN = tokenMatch ? tokenMatch[1].trim() : null;

async function testFetch() {
    const KASPI_API_URL = "https://kaspi.kz/shop/api/v2";

    if (!KASPI_TOKEN) {
        console.error("KASPI_API_TOKEN missing");
        return;
    }

    const dateFrom = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days
    const url = new URL(`${KASPI_API_URL}/orders`);
    url.searchParams.append("page[number]", "0");
    url.searchParams.append("page[size]", "50");
    url.searchParams.append("filter[orders][state]", "KASPI_DELIVERY");
    url.searchParams.append("filter[orders][creationDate][$ge]", dateFrom.toString());

    const response = await fetch(url.toString(), {
        headers: {
            "Content-Type": "application/vnd.api+json",
            "X-Auth-Token": KASPI_TOKEN
        }
    });

    const json = await response.json();

    if (json.data && json.data.length > 0) {

        // Grab the 2 target orders
        const targets = json.data.filter(o => o.attributes.code === '835464305' || o.attributes.code === '835910980');
        // Grab 2 older orders that the user says are already shipped
        const oldShipped = json.data.filter(o => o.attributes.code === '831478595' || o.attributes.code === '831810722');

        console.log("=== TARGET 'ПЕРЕДАЧА' ORDERS ===");
        console.log(JSON.stringify(targets.map(t => t.attributes), null, 2));

        console.log("\n=== OLD 'SHIPPED' ORDERS ===");
        console.log(JSON.stringify(oldShipped.map(t => t.attributes), null, 2));

    } else {
        console.log("No orders found");
    }
}

testFetch();
