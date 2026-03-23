/**
 * One-time script: appends 45 new trade connection entries to connections.json.
 * Run: node scripts/add-trade-connections.js
 */
const fs   = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'data', 'connections.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const newEntries = [
  {
    c: ['CIV', 'CHE'],
    type: 'trade',
    title: 'The Chocolate Pipeline',
    story: 'Ivory Coast grows more cocoa beans than any country on Earth. Switzerland turns those beans into the most famous chocolate in the world. Swiss companies like Nestlé and Lindt buy enormous amounts of Ivorian cocoa. Most people who eat Swiss chocolate have no idea it started as a bean on a farm in West Africa. The farmers who grow the cocoa rarely taste the finished chocolate.'
  },
  {
    c: ['SAU', 'JPN'],
    type: 'trade',
    title: 'Oil for Technology',
    story: "Saudi Arabia sits on top of some of the largest oil reserves on Earth. Japan has almost no oil at all but needs enormous amounts of it to power its factories and cities. So Japan buys Saudi oil and Saudi Arabia buys Japanese cars, electronics, and factory equipment. They've been trading like this for decades. Each country has exactly what the other one needs."
  },
  {
    c: ['COL', 'USA'],
    type: 'trade',
    title: 'The Morning Cup',
    story: 'Colombia grows some of the best coffee beans in the world, high in the Andes mountains where the air is cool and the soil is rich. The United States drinks more coffee than almost any country. Every morning, millions of Americans start their day with coffee that grew on a Colombian hillside. Juan Valdez, the fictional Colombian coffee farmer, became one of the most recognized characters in advertising history.'
  },
  {
    c: ['ETH', 'USA'],
    type: 'trade',
    title: 'Where Coffee Was Born',
    story: 'Ethiopia is where coffee was DISCOVERED. Legend says a goat herder named Kaldi noticed his goats dancing after eating berries from a certain tree. Those berries were coffee cherries. Today Ethiopia exports coffee to the entire world, and coffee ceremonies are one of the most important social traditions in Ethiopian culture. Every cup of coffee on Earth traces its ancestry back to the forests of Ethiopia.'
  },
  {
    c: ['AUS', 'CHN'],
    type: 'trade',
    title: 'The Iron Backbone',
    story: "Australia digs up massive amounts of iron ore from its red desert soil. China buys most of it to make steel for its buildings, bridges, and railways. For years, this was one of the biggest trade relationships on Earth. Australia's economy rises and falls with China's appetite for iron. When China builds, Australia booms."
  },
  {
    c: ['NLD', 'DEU'],
    type: 'trade',
    title: 'The Flower Auction',
    story: "The Netherlands is the flower capital of the world. Every single day, 20 million flowers are sold at a massive auction hall near Amsterdam. Roses, tulips, lilies. They arrive before dawn and by breakfast they're on planes to every continent. If you've ever received flowers, there's a good chance they passed through the Netherlands on their way to you."
  },
  {
    c: ['BRA', 'CHN'],
    type: 'trade',
    title: 'The Soybean Giant',
    story: 'Brazil is one of the largest food exporters on Earth. It grows enormous amounts of soybeans, sugar, orange juice, and beef. Restaurants and grocery stores on every continent serve food that grew in Brazilian soil. The Amazon rainforest is being cut down partly to make room for more soybean farms, which is one of the biggest environmental debates in the world.'
  },
  {
    c: ['BGD', 'USA'],
    type: 'trade',
    title: 'The Clothes on Your Back',
    story: 'Bangladesh makes more clothing than almost any country except China. Look at the tag on your shirt. There\'s a good chance it says "Made in Bangladesh." Millions of Bangladeshi workers, many of them women, sew the clothes that people wear in Europe, America, and everywhere else. The clothing industry transformed Bangladesh from one of the poorest countries to one of the fastest-growing economies in Asia.'
  },
  {
    c: ['CHL', 'CHN'],
    type: 'trade',
    title: 'Copper Veins',
    story: "Chile produces more copper than any country on Earth. Copper is in every wire in your house, every phone you've touched, every car on the road. Without Chilean copper, the modern world would stop working. The Chuquicamata mine in the Atacama Desert is so big you can see it from space."
  },
  {
    c: ['COD', 'CHN'],
    type: 'trade',
    title: 'The Battery Metal',
    story: "Deep in the ground of the Democratic Republic of Congo is most of the world's cobalt. Cobalt goes into the rechargeable batteries that power phones, laptops, and electric cars. Almost every battery in your life has a tiny piece of Congo in it. The mining is dangerous and sometimes children are forced to work in the mines, which is why companies around the world are trying to find ways to make batteries without cobalt."
  },
  {
    c: ['KEN', 'GBR'],
    type: 'trade',
    title: 'The Tea Connection',
    story: 'Kenya is one of the biggest tea exporters in the world, and Britain drinks more tea per person than almost any country. Kenyan tea plantations cover the green highlands near the Great Rift Valley. British companies package and sell it. When a British person says "fancy a cuppa?" there\'s a very good chance the tea leaves grew on a Kenyan hillside.'
  },
  {
    c: ['NOR', 'JPN'],
    type: 'trade',
    title: 'The Fish Exchange',
    story: "Norway farms enormous amounts of salmon in its cold, deep fjords. Japan loves salmon for sushi. In fact, it was Norwegian salmon exporters who convinced Japan to start eating raw salmon in the 1980s. Before that, the Japanese didn't consider salmon a sushi fish. Norway literally changed Japanese food culture to sell more fish."
  },
  {
    c: ['GHA', 'CHE'],
    type: 'trade',
    title: 'Gold and Cocoa',
    story: "Ghana has two famous exports: gold and cocoa. The country used to be called the Gold Coast because European traders came for its gold for centuries. Today, Swiss refineries process much of Ghana's gold into bars and jewelry. And just like its neighbor Ivory Coast, Ghana's cocoa beans end up in European chocolate. Ghana's land has been feeding the world's sweet tooth and decorating its fingers for hundreds of years."
  },
  {
    c: ['MDG', 'USA'],
    type: 'trade',
    title: 'The Vanilla Island',
    story: "Madagascar grows about 80% of the world's vanilla. The vanilla plant originally came from Mexico, but Madagascar's climate turned out to be perfect for it. Real vanilla is incredibly labor-intensive to grow. Each flower has to be pollinated BY HAND because the bee that naturally pollinates it only lives in Mexico. That's why vanilla is the second most expensive spice in the world after saffron."
  },
  {
    c: ['IRN', 'ESP'],
    type: 'trade',
    title: 'The Saffron Fields',
    story: "Iran produces about 90% of the world's saffron, the most expensive spice on Earth. Saffron comes from a tiny part of the crocus flower, and each flower only produces three threads. It takes about 75,000 flowers to make one pound of saffron. Iranian farmers have been growing it for over 3,000 years. A pinch of saffron in rice turns it golden yellow and gives it a flavor nothing else can match."
  },
  {
    c: ['BOL', 'CHN'],
    type: 'trade',
    title: 'The Lithium Lake',
    story: "High in the Bolivian Andes sits the Salar de Uyuni, the largest salt flat on Earth. It's breathtakingly beautiful, a mirror that reflects the sky. Underneath it lies one of the world's largest reserves of lithium, the metal that makes electric car batteries work. As the world switches from gasoline to electric, Bolivia could become one of the most important countries on Earth. The salt flat that tourists photograph could power the future."
  },
  {
    c: ['VNM', 'KOR'],
    type: 'trade',
    title: 'The Phone Factory',
    story: "Vietnam has quietly become one of the world's biggest electronics manufacturers. Samsung makes more phones in Vietnam than in South Korea, where Samsung was founded. Vietnam went from rice paddies to high-tech factories in one generation. Your phone might say Samsung or Apple on the front, but there's a growing chance it was assembled by Vietnamese workers."
  },
  {
    c: ['ECU', 'USA'],
    type: 'trade',
    title: 'The Banana Republic',
    story: 'Ecuador exports more bananas than any country on Earth. The bananas at your grocery store almost certainly came from Ecuador, Colombia, or Costa Rica. The phrase "banana republic" was invented to describe Central and South American countries whose economies depended on fruit exports to American companies. Ecuador has worked hard to control its own banana industry rather than letting foreign companies run it.'
  },
  {
    c: ['THA', 'CHN'],
    type: 'trade',
    title: 'The Rice Bowl',
    story: "Thailand was the world's biggest rice exporter for decades. Thai jasmine rice, with its soft texture and flowery smell, is served in restaurants everywhere. Rice isn't just food in Thailand. It's culture, identity, and the backbone of rural life. Thai farmers have been perfecting rice cultivation for thousands of years. When you eat Thai food, the rice matters as much as the curry."
  },
  {
    c: ['BWA', 'BEL'],
    type: 'trade',
    title: 'The Diamond Democracy',
    story: "Botswana discovered diamonds in 1967, just one year after becoming independent. Instead of letting the wealth flow to a few powerful people (like in some diamond-producing countries), Botswana's government invested diamond money in schools, hospitals, and roads for everyone. It's one of the great success stories of natural resource management. Botswana went from one of the poorest countries in Africa to one of the most stable and prosperous."
  },
  {
    c: ['NZL', 'GBR'],
    type: 'trade',
    title: 'The Butter Boat',
    story: 'New Zealand has more sheep and cows than people. Way more. About 10 million cows and 26 million sheep for 5 million humans. New Zealand exports enormous amounts of butter, milk, cheese, lamb, and wool to countries all over the world. For over a century, refrigerated ships have carried New Zealand butter to British breakfast tables. The entire country is essentially a farm surrounded by ocean.'
  },
  {
    c: ['CRI', 'USA'],
    type: 'trade',
    title: 'The Pineapple Express',
    story: "Costa Rica is the world's biggest pineapple exporter. Those sweet pineapples at the supermarket? Probably Costa Rican. The country also exports bananas, coffee, and medical devices. Costa Rica chose to invest in education and nature instead of military. It's one of the few countries in the world with no army. It turns out you can build a successful economy on pineapples, national parks, and educated people."
  },
  {
    c: ['IND', 'ESP'],
    type: 'trade',
    title: 'The Spice Chest',
    story: "India has been the world's spice center for thousands of years. Black pepper, cardamom, turmeric, cumin, cinnamon. European explorers sailed around the entire world trying to find a sea route to Indian spices. Columbus was looking for India when he accidentally found America. The spice trade literally changed the map of the world, and India was the reason."
  },
  {
    c: ['PER', 'ESP'],
    type: 'trade',
    title: 'The Potato Ambassador',
    story: 'Peru gave the world the potato. There are over 3,000 varieties of potato in Peru, in every color: purple, red, yellow, blue, white. Spanish colonizers brought potatoes to Europe in the 1500s, and potatoes became the most important food in Ireland, Germany, Russia, and beyond. French fries, mashed potatoes, baked potatoes, chips. All of it traces back to the Andes mountains of Peru.'
  },
  {
    c: ['MEX', 'ITA'],
    type: 'trade',
    title: 'The Food That Conquered the Planet',
    story: 'Mexico gave the world chocolate, vanilla, corn, chili peppers, avocados, and tomatoes. Think about that. Italian food without tomatoes? Thai food without chilies? Indian food without chili peppers? None of it existed before these plants left Mexico. Mexican food didn\'t just become popular. Mexican INGREDIENTS became the foundation of almost every cuisine on Earth.'
  },
  {
    c: ['CHN', 'USA'],
    type: 'trade',
    title: 'The Workshop of the World',
    story: "China makes more manufactured goods than any country in history. Electronics, furniture, clothing, toys, tools, car parts. Look around whatever room you're in right now. There's almost certainly something in it that was made in China. China has more factory workers than some countries have people. It went from a poor farming nation to the world's factory floor in 40 years."
  },
  {
    c: ['DEU', 'USA'],
    type: 'trade',
    title: 'The Engine Room',
    story: 'Germany builds some of the best cars, machines, and factory equipment on Earth. Mercedes, BMW, Volkswagen, Porsche. But it\'s not just cars. German-made machines fill factories in every country. When another country wants to build something precisely and reliably, they often buy German equipment to do it. "German engineering" became a phrase because Germany earned that reputation over 150 years.'
  },
  {
    c: ['IDN', 'IND'],
    type: 'trade',
    title: 'The Palm Oil Dilemma',
    story: "Indonesia produces more palm oil than any country on Earth. Palm oil is in everything: cookies, shampoo, lipstick, pizza dough, ice cream, biodiesel fuel. It's the most widely used vegetable oil in the world. But growing palm oil means cutting down rainforest, which destroys the home of orangutans, tigers, and elephants. Indonesia faces the hardest trade question in the world: money or forest."
  },
  {
    c: ['COL', 'NLD'],
    type: 'trade',
    title: 'The Flower Flight',
    story: "Colombia grows millions of roses, carnations, and orchids in its cool highland climate. The Netherlands buys and distributes them. Every Valentine's Day, cargo planes packed with Colombian flowers fly nonstop to the Dutch flower auctions. By February 14th, those roses are in vases in London, Tokyo, and New York. The trip from Colombian greenhouse to your kitchen table takes about 48 hours."
  },
  {
    c: ['JPN', 'AUS'],
    type: 'trade',
    title: 'The Energy Trade',
    story: "Japan has almost no natural gas, coal, or iron. Australia has enormous amounts of all three. Australia ships raw materials across the Pacific and Japan turns them into cars, electronics, and steel. They've been partners in this exchange for 60 years. Japan needs Australia's ground. Australia needs Japan's factories."
  },
  {
    c: ['CUB', 'ESP'],
    type: 'trade',
    title: 'The Cigar Island',
    story: "Cuba's hand-rolled cigars are considered the finest in the world. Cuban tobacco grows in the Vuelta Abajo valley, where the soil, humidity, and temperature create a flavor no other country can replicate. Despite decades of trade embargos, Cuban cigars remain legendary. The cigar rollers (torcedores) are treated like artists. A master roller can produce over 100 perfect cigars a day using only their hands."
  },
  {
    c: ['MAR', 'ESP'],
    type: 'trade',
    title: 'The Fish and Fruit Corridor',
    story: "Morocco and Spain are separated by just 9 miles of water at the Strait of Gibraltar. Moroccan fruits, vegetables, and fish cross to Spain every day. Spanish tourists cross to Morocco every day. It's one of the tightest trade corridors in the world: two continents almost touching, exchanging everything across a narrow strip of sea."
  },
  {
    c: ['RWA', 'USA'],
    type: 'trade',
    title: 'The Gorilla Economy',
    story: "Rwanda rebuilt itself after a devastating tragedy by betting on gorilla tourism, specialty coffee, and technology. Tourists pay $1,500 per person to spend one hour with mountain gorillas in Rwanda's misty forests. That money protects the gorillas AND funds the country's development. Rwanda turned its rarest animal into its most valuable export, without shipping a single thing."
  },
  {
    c: ['ISL', 'GBR'],
    type: 'trade',
    title: 'The Cod Wars',
    story: 'Iceland and Britain fought THREE separate "Cod Wars" between 1958 and 1976. Not with guns, but with fishing boats and coast guard ships ramming each other over who got to catch cod in the North Atlantic. Iceland won every time. Tiny Iceland pushed the British Royal Navy out of its fishing waters. The fish were that valuable. It\'s one of the strangest conflicts in modern history.'
  },
  {
    c: ['ZMB', 'CHN'],
    type: 'trade',
    title: 'The Copper Belt',
    story: "Zambia's economy runs on copper. The Copperbelt region in northern Zambia has been mined for over a century. In recent decades, Chinese companies have invested heavily in Zambian copper mines. China needs copper for its electronics and construction boom. The relationship has brought jobs and roads to Zambia, but also tensions over working conditions and environmental impact."
  },
  {
    c: ['LKA', 'GBR'],
    type: 'trade',
    title: 'The Tea Island',
    story: 'Sri Lanka (once called Ceylon) produces some of the world\'s finest tea. "Ceylon tea" is a brand recognized everywhere. The tea plantations cover Sri Lanka\'s misty central highlands, where workers pick leaves by hand. Sri Lanka is small, but it\'s the world\'s 4th largest tea producer. The British planted the first tea bushes here in the 1800s, and tea became the island\'s identity.'
  },
  {
    c: ['MNG', 'CHN'],
    type: 'trade',
    title: 'The Cashmere Road',
    story: "Mongolia's goats produce some of the finest cashmere wool in the world. That incredibly soft sweater that costs $200? It might have started as hair on a Mongolian goat living on the vast steppe. China buys most of Mongolia's raw cashmere and processes it into finished clothing. The goats are so profitable that herders keep expanding their flocks, which is causing overgrazing on the fragile grasslands."
  },
  {
    c: ['PHL', 'USA'],
    type: 'trade',
    title: 'The Coconut Republic',
    story: 'The Philippines is the world\'s largest coconut producer. Coconut oil, coconut water, coconut milk, dried coconut. Coconut palms cover the islands. After typhoons destroy the trees, Filipino farmers replant and start over. The coconut palm is called the "tree of life" in the Philippines because every single part of it can be used for something: food, fuel, building material, rope, even music instruments.'
  },
  {
    c: ['TUR', 'DEU'],
    type: 'trade',
    title: 'The Guest Worker Bridge',
    story: 'In the 1960s, Germany invited Turkish workers to fill its factory jobs. They were called "guest workers" and were supposed to go home. Most stayed. Today, about 3 million people of Turkish descent live in Germany. Turkish döner kebab is Germany\'s most popular street food. Turkish-German families bridge two cultures. What started as a labor trade became one of Europe\'s most important cultural connections.'
  },
  {
    c: ['SEN', 'FRA'],
    type: 'trade',
    title: 'The Peanut Nation',
    story: "Senegal's farmers grow enormous amounts of peanuts (called groundnuts). Peanuts are everywhere in Senegalese cooking, especially in mafé, a rich peanut butter stew that's one of the most delicious dishes in West Africa. Senegal exports peanut oil and peanut products across the world. The humble peanut built an economy."
  },
  {
    c: ['GTM', 'USA'],
    type: 'trade',
    title: 'The Coffee and Banana Route',
    story: "Guatemala exports coffee and bananas to the United States, a trade relationship that goes back over 100 years. Guatemalan coffee, grown on volcanic mountain slopes, is prized for its rich flavor. American fruit companies once had so much power in Guatemala that they influenced the government. The trade relationship has a complicated history, but the coffee is undeniably excellent."
  },
  {
    c: ['KOR', 'USA'],
    type: 'trade',
    title: 'The K-Wave Export',
    story: "South Korea doesn't just export cars and electronics. It exports CULTURE. K-pop music, Korean dramas, Korean skincare, Korean food. Samsung and Hyundai built the economic foundation, but BTS and Korean BBQ conquered the world's attention. South Korea is the first country to make pop culture a deliberate economic strategy, and it's working."
  },
  {
    c: ['QAT', 'JPN'],
    type: 'trade',
    title: 'The Liquid Gold',
    story: 'Qatar is a tiny peninsula in the Persian Gulf, but it sits on one of the largest natural gas reserves on Earth. Liquefied natural gas (LNG) ships sail from Qatar to Japan, South Korea, China, and Europe every day. Qatar used its gas wealth to build futuristic cities, host the FIFA World Cup, and create one of the highest per-capita incomes on the planet. A country smaller than Connecticut powering millions of homes worldwide.'
  },
  {
    c: ['UZB', 'RUS'],
    type: 'trade',
    title: 'The Cotton Question',
    story: "Uzbekistan was once one of the world's biggest cotton exporters. The Soviet Union forced Uzbekistan to grow cotton at an enormous scale, which drained the Aral Sea (once the 4th largest lake on Earth) almost completely dry. It's one of the worst environmental disasters in history. Today Uzbekistan is trying to diversify away from cotton and restore what's left of the sea. The cotton fields that built an economy also destroyed a sea."
  },
  {
    c: ['NGA', 'USA'],
    type: 'trade',
    title: 'The Oil Giant',
    story: "Nigeria is Africa's largest oil producer. Oil accounts for most of the government's revenue. The Niger Delta region, where the oil comes from, has been both enriched and devastated by drilling. Oil spills have damaged farmland and fishing waters. Nigeria's challenge is the same challenge many oil-rich countries face: how do you build a diverse economy when one product makes all the money?"
  }
];

const updated = data.concat(newEntries);
fs.writeFileSync(file, JSON.stringify(updated, null, 2));
console.log('Done.');
console.log('  Before:', data.length, 'entries');
console.log('  Added: ', newEntries.length, 'entries');
console.log('  Total: ', updated.length, 'entries');

// Final type distribution
const typeCounts = {};
updated.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
console.log('  Types:', JSON.stringify(typeCounts));
