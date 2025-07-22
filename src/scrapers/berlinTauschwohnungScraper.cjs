// Convert to CommonJS
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.tauschwohnung.com/suche/wohnung-mieten/berlin?page={PAGE}&order=standard&locationIds[regions]=&locationIds[cities]=3806&locationIds[areas]=&rentMax=&sizeMin=&roomsMin=1.0&housingType=1&properties=&housingProperties=&radius=&storeyMin=-1&storeyMax=10&propertySizeMin=&wgType=&requireImages=0';

async function scrapeTauschwohnungBerlin() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const allLinks = [];
  const pagesToScrape = 5; // Scrape 5 pages
  
  // Scrape multiple pages to get more listings
  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const url = BASE_URL.replace('{PAGE}', pageNum.toString());
    console.log(`\n=== Scraping Page ${pageNum}/${pagesToScrape} ===`);
    console.log(`URL: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    if (pageNum === 1) {
      console.log('Saving summary page HTML...');
      const summaryHtml = await page.content();
      require('fs').writeFileSync('summary_page.html', summaryHtml);
      await page.screenshot({ path: 'summary_page.png', fullPage: true });
    }

    // Get all listing links from this page
    const pageLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .map(a => a.href)
        .filter(href => href.includes('/wohnung-mieten/berlin/') && /\d+$/.test(href))
        .filter((v, i, arr) => arr.indexOf(v) === i); // unique
    });

    console.log(`Found ${pageLinks.length} listing links on page ${pageNum}`);
    allLinks.push(...pageLinks);
    
    // Add a small delay between pages to be respectful
    if (pageNum < pagesToScrape) {
      console.log('Waiting 2 seconds before next page...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Remove duplicates
  const uniqueLinks = [...new Set(allLinks)];
  console.log(`\n=== Total unique listings found: ${uniqueLinks.length} ===`);

  const listings = [];

  for (const [i, link] of uniqueLinks.entries()) {
    console.log(`Processing listing ${i + 1}/${uniqueLinks.length}: ${link}`);
    const detailPage = await browser.newPage();
    await detailPage.goto(link, { waitUntil: 'networkidle2' });
    try {
      await detailPage.waitForSelector('.info', { timeout: 7000 });
      console.log(`  ✓ Page loaded successfully`);
      if (i === 0) {
        const html = await detailPage.content();
        require('fs').writeFileSync('first_detail_page.html', html);
      }
      const data = await detailPage.evaluate(() => {
        const parseNumber = (str) => Number(str.replace(/[^\d,.]/g, '').replace(',', '.'));
        const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
        const getFeature = (key) => {
          const dl = Array.from(document.querySelectorAll('.features-table dl'));
          for (const d of dl) {
            const dt = d.querySelector('dt')?.textContent?.trim();
            const dd = d.querySelector('dd')?.textContent?.trim();
            if (dt === key) return dd || '';
          }
          return '';
        };
        const getFeaturesList = () => {
          const dl = Array.from(document.querySelectorAll('.features-table dl'));
          return dl.map(d => {
            const dt = d.querySelector('dt')?.textContent?.trim();
            const dd = d.querySelector('dd')?.textContent?.trim();
            return dt && dd ? `${dt}: ${dd}` : '';
          }).filter(Boolean);
        };
        // Main fields
        const address = getText('.info address');
        const district = address.split(',')[1]?.trim() || '';
        const type = getFeature('Typ') || getFeature('Objektart') || 'Apartment';
        // Top info bar
        const infoLis = document.querySelectorAll('.info ul li');
        const coldRent = infoLis[0] ? parseNumber(infoLis[0].querySelector('div')?.textContent || '') : 0;
        const rooms = infoLis[1] ? parseNumber(infoLis[1].querySelector('div')?.textContent || '') : 0;
        const squareMeters = infoLis[2] ? parseNumber(infoLis[2].querySelector('div')?.textContent || '') : 0;
        // Title extraction (robust)
        let title = getText('.info h1') || getText('.title') || document.title || '';
        // Remove site name from document.title if present
        if (title && document.title && title === document.title && title.includes(' - ')) {
          title = title.split(' - ')[0].trim();
        }
        // Features table
        const extraCosts = parseNumber(getFeature('Nebenkosten'));
        const deposit = parseNumber(getFeature('Kaution'));
        const floor = parseNumber(getFeature('Stockwerk'));
        const petsAllowed = (getFeature('Haustiere') || getFeature('Sonstige Merkmale')).toLowerCase().includes('erlaubt');
        const balconyOrTerrace = (getFeature('Außenausstattungen') || '').toLowerCase().includes('balkon') || (getFeature('Außenausstattungen') || '').toLowerCase().includes('terrasse');
        const heating = getFeature('Heizung');
        const flooring = getFeature('Fußboden');
        const wbs = (getFeature('Sonstige Merkmale') || '').toLowerCase().includes('berechtigungsschein');
        // Description (offered)
        let description = '';
        let offeredDescription = '';
        let lookingForDescription = '';
        const descArticle = Array.from(document.querySelectorAll('article')).find(a => a.querySelector('h2')?.textContent?.includes('Beschreibung'));
        if (descArticle) {
          description = descArticle.querySelector('.content')?.textContent?.trim() || '';
          offeredDescription = description;
        }
        // Try to extract 'Suche', 'Sucht', or 'Tausch' section for lookingForDescription
        const lookingForArticle = Array.from(document.querySelectorAll('article')).find(a => {
          const h2 = a.querySelector('h2')?.textContent?.toLowerCase() || '';
          return h2.includes('suche') || h2.includes('sucht') || h2.includes('tausch');
        });
        if (lookingForArticle) {
          lookingForDescription = lookingForArticle.querySelector('.content')?.textContent?.trim() || '';
        }
        // Contact name (if available)
        let contactName = '';
        const contactArticle = Array.from(document.querySelectorAll('article')).find(a => a.querySelector('h2')?.textContent?.match(/sucht|bietet/i));
        if (contactArticle) {
          const h2 = contactArticle.querySelector('h2')?.textContent?.trim();
          if (h2) contactName = h2.replace(/\s+sucht.*|\s+bietet.*/i, '').trim();
        }
        // Link
        const link = window.location.href;
        // Scrape images (first real image)
        let images = [];
        // Try to find images in the gallery or main image container
        const galleryImgs = Array.from(document.querySelectorAll('.gallery img, .image-gallery img, .swiper img, .main-image img'));
        images = galleryImgs
          .map(img => img.src)
          .filter(src =>
            src &&
            !src.includes('logo') &&
            !src.includes('consentmanager') &&
            !src.includes('placeholder') &&
            !src.endsWith('.svg')
          );
        // Fallback: any img in the main content, but filter out logos/generic images
        if (images.length === 0) {
          const fallbackImgs = Array.from(document.querySelectorAll('img'));
          images = fallbackImgs
            .map(img => img.src)
            .filter(src =>
              src &&
              !src.includes('logo') &&
              !src.includes('consentmanager') &&
              !src.includes('placeholder') &&
              !src.endsWith('.svg')
            );
        }
        if (images.length > 0) {
          images = [images[0]]; // Only keep the first real image
        }
        return {
          link,
          district,
          type,
          coldRent,
          rooms,
          squareMeters,
          title,
          extraCosts,
          deposit,
          floor,
          petsAllowed,
          balconyOrTerrace,
          features: getFeaturesList(),
          heating,
          flooring,
          wbs,
          description,
          offeredDescription,
          lookingForDescription,
          contactName,
          address,
          images,
        };
      });
      console.log(`  ✓ Data extracted successfully`);
      // Check for required fields
      const requiredFields = ['link', 'coldRent', 'rooms', 'squareMeters', 'title', 'district', 'type'];
      const missing = requiredFields.filter(f => !(data[f]) && data[f] !== 0);
      console.log(`Listing ${i + 1}: ${link}`);
      console.log('Field values:', requiredFields.map(f => `${f}: ${JSON.stringify(data[f])}`).join(', '));
      if (missing.length > 0) {
        console.warn(`Skipping listing (missing fields: ${missing.join(', ')}): ${link}`);
        console.warn('Field values:', requiredFields.map(f => `${f}: ${JSON.stringify(data[f])}`).join(', '));
        await detailPage.close();
        continue;
      }
      console.log('✓ All required fields present');
      listings.push(data);
    } catch (e) {
      console.error(`  ✗ Failed to scrape ${link}:`, e);
    } finally {
      await detailPage.close();
    }
  }

  fs.writeFileSync('berlin_listings.json', JSON.stringify(listings, null, 2));
  console.log(`Scraped ${listings.length} listings.`);
  await browser.close();
}

scrapeTauschwohnungBerlin().catch(console.error); 