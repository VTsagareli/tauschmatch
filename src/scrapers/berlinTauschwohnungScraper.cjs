// Convert to CommonJS
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.tauschwohnung.com/suche/wohnung-mieten/berlin?storeyMin=-1&storeyMax=10&residentCountAdults=1&residentCountChildren=0&residentCount=1&radius=0&housingTypeId=1&orderBy=standard&page=1&resultsPerPage=10&selectedGeoPublicIdsCsv=h9xp4ycbid';

async function scrapeTauschwohnungBerlin() {
  console.log('🚀 Starting scraper...');
  console.log(`📌 Base URL: ${BASE_URL}`);
  
  const browser = await puppeteer.launch({ headless: true });
  console.log('✓ Browser launched');
  
  const page = await browser.newPage();
  console.log('✓ New page created');
  
  const allLinks = [];
  const pagesToScrape = 10; // Scrape 10 pages
  
  console.log(`\n📄 Will scrape ${pagesToScrape} pages\n`);
  
  // Scrape multiple pages to get more listings
  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const url = BASE_URL.replace(/page=\d+/, `page=${pageNum}`);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📖 Scraping Page ${pageNum}/${pagesToScrape}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      console.log(`⏳ Navigating to page ${pageNum}...`);
      // Use domcontentloaded instead of networkidle2 for faster loading
      console.log(`⏳ Navigating with domcontentloaded (faster)...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`✓ Page ${pageNum} loaded (domcontentloaded)`);
      
      // Wait shorter for dynamic content to load (Vue/Nuxt apps need some time)
      console.log(`⏳ Waiting 3 seconds for dynamic content...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`✓ Wait complete`);
      
      // Scroll to trigger lazy loading (faster)
      console.log(`📜 Scrolling to trigger lazy loading...`);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`✓ Scrolled to bottom, waiting 1s...`);
      
      console.log(`📜 Scrolling back to top...`);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`✓ Scrolled to top`);
    } catch (err) {
      console.error(`❌ Failed to load page ${pageNum}:`, err.message);
      console.error(`   Stack: ${err.stack}`);
      continue;
    }
    
    if (pageNum === 1) {
      console.log('💾 Saving summary page HTML and screenshot for debugging...');
      const summaryHtml = await page.content();
      require('fs').writeFileSync('summary_page.html', summaryHtml);
      await page.screenshot({ path: 'summary_page.png', fullPage: true });
      console.log(`✓ Saved summary_page.html (${(summaryHtml.length / 1024).toFixed(2)} KB)`);
      console.log(`✓ Saved summary_page.png`);
    }

    // Wait for listing cards or content to appear - try multiple selectors
    console.log(`\n🔍 Looking for listing content on page ${pageNum}...`);
    let foundContent = false;
    const selectors = [
      'a[href*="/wohnung-mieten/berlin/"]',
      'a[href*="/wohnung-mieten/"]',
      '.tw-housing-card a',
      'article a',
      '[data-housing-id]',
      'a[href*="/343168"]', // Sample housing ID pattern
    ];
    
    console.log(`   Trying ${selectors.length} different selectors...`);
    for (const selector of selectors) {
      try {
        console.log(`   ⏳ Trying selector: ${selector}...`);
        await page.waitForSelector(selector, { timeout: 5000 });
        foundContent = true;
        console.log(`   ✓ Found content with selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`   ✗ Selector failed: ${selector} (timeout after 5s)`);
        // Continue to next selector
      }
    }
    
    if (!foundContent) {
      console.warn(`⚠️  Could not find listing selectors on page ${pageNum}, proceeding anyway...`);
    }

    // Get all listing links from this page - try both DOM and JSON extraction
    console.log(`\n🔗 Extracting links from page ${pageNum}...`);
    console.log(`   Starting page.evaluate() with timeout protection...`);
    
    let evaluationResult;
    try {
      // Add timeout wrapper around page.evaluate()
      evaluationResult = await Promise.race([
        page.evaluate(() => {
          // Method 1: Extract from DOM anchors (including housing cards)
          // Try to get links directly from housing cards first
          const housingCards = Array.from(document.querySelectorAll('.tw-housing-card, [data-housing-id], article'));
          let cardLinks = [];
          housingCards.forEach(card => {
            const link = card.querySelector('a[href*="wohnung-mieten"]');
            if (link && link.href) {
              cardLinks.push(link.href);
            }
            // Also try nested links or any anchor in the card
            const allLinks = card.querySelectorAll('a');
            allLinks.forEach(a => {
              if (a.href && a.href.includes('wohnung-mieten/berlin/')) {
                cardLinks.push(a.href);
              }
            });
          });
          
          // Also get all anchors as fallback
          const anchors = Array.from(document.querySelectorAll('a'));
          const hrefs = anchors.map(a => a.href);
          
          // Combine card links with all anchors
          const allHrefs = [...new Set([...cardLinks, ...hrefs])];
          
          // Method 2: Extract from embedded JSON in script tags (optimized)
          const scriptTags = Array.from(document.querySelectorAll('script'));
          let jsonLinks = [];
          let scriptsChecked = 0;
          const MAX_SCRIPT_SIZE = 500000; // Skip scripts larger than 500KB
          
          for (const script of scriptTags) {
            scriptsChecked++;
            const content = script.textContent || '';
            
            // Skip very large scripts to avoid performance issues
            if (content.length > MAX_SCRIPT_SIZE) {
              continue;
            }
            
            // Optimized: Only check scripts that might contain URLs
            if (!content.includes('wohnung-mieten') && !content.includes('berlin')) {
              continue;
            }
            
            // Look for URLs in the JSON data
            // The pattern stops at certain characters, so we need to be smarter
            // Try to match complete listing URLs by requiring at least district + slug
            // Pattern: wohnung-mieten/berlin/[district]/[slug] where slug must exist
            
            // First, try to find complete URLs with IDs (most reliable)
            const idPattern = /wohnung-mieten\/berlin\/[^"\\s,)]+\/[^"\\s,)]+-?[0-9]{4,}/g;
            const idMatches = content.match(idPattern) || [];
            
            // Also try to find URLs in quoted strings (JSON format)
            const quotedPattern = /"(wohnung-mieten\/berlin\/[^"]+)"/g;
            let quotedMatches = [];
            let match;
            while ((match = quotedPattern.exec(content)) !== null) {
              if (match[1] && match[1].split('/').length >= 3) {
                quotedMatches.push(match[1]);
              }
            }
            
            // Also use the simple pattern but filter better
            const simplePattern = /wohnung-mieten\/berlin\/[^"\\s,)]+\/[^"\\s,)]{10,}/g;
            const simpleMatches = content.match(simplePattern) || [];
            
            // Combine all patterns and deduplicate
            const urlMatches = [...new Set([...idMatches, ...quotedMatches, ...simpleMatches])];
            
            // Debug: log if we find matches
            if (urlMatches.length > 0 && scriptsChecked === 1) {
              // Only log from first script to avoid spam
            }
            if (urlMatches && urlMatches.length > 0) {
              // Process all matches, then deduplicate AFTER converting to full URLs
              const processedMatches = urlMatches.map(url => {
                // Remove trailing slashes and clean up
                url = url.replace(/\/+$/, '');
                // Convert relative to absolute URL
                if (url.startsWith('wohnung-mieten')) {
                  return 'https://www.tauschwohnung.com/' + url;
                }
                return url;
              });
              
              // Deduplicate after processing (to catch variations like trailing slashes)
              const uniqueProcessed = [...new Set(processedMatches)];
              
              // Add all unique links (don't limit - we want all 10 listings per page)
              jsonLinks.push(...uniqueProcessed);
            }
            
            // Safety: If we've found enough links, stop processing scripts
            if (jsonLinks.length > 500) {
              break;
            }
          }
          
          // Filter for actual listing URLs (must have district and listing slug/id)
          // A valid listing URL has format: /wohnung-mieten/berlin/[district]/[listing-slug]
          // We exclude: search pages, district-only pages
          
          // Simplified pattern: must have 3+ path segments (berlin/district/slug)
          const isListingURL = (href) => {
            // Must not be a search URL
            if (href.includes('/suche/')) return false;
            
            // Must contain the base path
            if (!href.includes('wohnung-mieten/berlin/')) return false;
            
            // Extract path after 'wohnung-mieten/berlin/'
            // Handle both full URLs and relative paths
            const parts = href.split('wohnung-mieten/berlin/');
            if (parts.length < 2) return false;
            
            // Get everything after 'wohnung-mieten/berlin/'
            let pathAfterBase = parts[1];
            
            // Remove query parameters and fragments
            pathAfterBase = pathAfterBase.split('?')[0].split('#')[0];
            
            // Split by '/' to get parts
            const pathParts = pathAfterBase.split('/').filter(p => p && p.trim());
            
            // Must have at least 2 parts: [district] and [listing-slug]
            if (pathParts.length < 2) return false;
            
            // The last part should be a listing slug (has more than just district name)
            const listingSlug = pathParts[pathParts.length - 1];
            if (!listingSlug || listingSlug.length < 3) return false;
            
            // Must not end with just district (district-only pages end with just district name)
            // If it only has one part, it's a district page
            if (pathParts.length === 1) return false;
            
            return true;
          };
          
          const validListings = allHrefs.filter(href => isListingURL(href));
          
          // Filter JSON links similarly
          const validJsonLinks = jsonLinks.filter(href => isListingURL(href));
          
          // Combine all sources and deduplicate
          const allListings = [...new Set([...validListings, ...validJsonLinks])];
      
          // Debug: log some examples if found
          const sampleJsonLinks = jsonLinks.slice(0, 5);
          const sampleValidJson = validJsonLinks.slice(0, 5);
      
          return {
            anchorCount: anchors.length,
            cardLinksFound: cardLinks.length,
            sampleAnchors: allHrefs.slice(0, 10),
            allHrefsWithPattern: allHrefs.filter(h => h.includes('wohnung')).slice(0, 20),
            listingLinks: allListings,
            jsonLinksFound: jsonLinks.length,
            validJsonLinksFound: validJsonLinks.length,
            validListingsCount: validListings.length,
            jsonLinksCount: jsonLinks.length,
            scriptsChecked: scriptsChecked,
            totalHrefs: allHrefs.length,
            sampleJsonLinks: sampleJsonLinks,
            sampleValidJson: sampleValidJson,
          };
        }),
        // Timeout after 20 seconds
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('page.evaluate() timeout after 20s')), 20000)
        )
      ]);
    } catch (e) {
      console.error(`❌ Error during link extraction on page ${pageNum}: ${e.message}`);
      console.error(`   This might be due to page timeout or too much data. Continuing with empty links...`);
      // Continue with empty results for this page
      evaluationResult = {
        anchorCount: 0,
        sampleAnchors: [],
        allHrefsWithPattern: [],
        listingLinks: [],
        jsonLinksFound: 0,
        validJsonLinksFound: 0,
        validListingsCount: 0,
        jsonLinksCount: 0,
        scriptsChecked: 0,
        totalHrefs: 0,
      };
    }
    
    const { listingLinks, anchorCount, cardLinksFound, sampleAnchors, allHrefsWithPattern, jsonLinksFound, validJsonLinksFound, validListingsCount, jsonLinksCount, scriptsChecked, sampleJsonLinks, sampleValidJson } = evaluationResult;
    
    console.log(`   ✓ Page evaluation complete`);
    
    console.log(`📊 Link extraction statistics:`);
    console.log(`   • Housing cards found: ${cardLinksFound || 0}`);
    console.log(`   • Total anchors on page: ${anchorCount}`);
    console.log(`   • Scripts checked for JSON: ${scriptsChecked || 'N/A'}`);
    console.log(`   • Raw JSON links found: ${jsonLinksFound || 0}`);
    if (sampleJsonLinks && sampleJsonLinks.length > 0) {
      console.log(`   • Sample raw JSON links (first 3):`);
      sampleJsonLinks.slice(0, 3).forEach((link, i) => console.log(`     ${i+1}. ${link.substring(0, 90)}`));
    }
    console.log(`   • Valid JSON links: ${validJsonLinksFound || 0}`);
    if (sampleValidJson && sampleValidJson.length > 0) {
      console.log(`   • Sample valid JSON links (first 3):`);
      sampleValidJson.slice(0, 3).forEach((link, i) => console.log(`     ${i+1}. ${link}`));
    }
    console.log(`   • Valid DOM links: ${validListingsCount || 0}`);
    console.log(`   • Total unique listing links: ${listingLinks.length}`);

    if (sampleAnchors && sampleAnchors.length === 0) {
      console.warn(`⚠️  No anchor hrefs detected in first 10 elements on page ${pageNum}`);
    }
    
    if (allHrefsWithPattern && allHrefsWithPattern.length > 0) {
      console.log(`\n🔗 Found ${allHrefsWithPattern.length} links containing "wohnung" (showing first 5):`);
      allHrefsWithPattern.forEach((href, idx) => {
        if (idx < 5) console.log(`   ${idx + 1}. ${href.substring(0, 80)}${href.length > 80 ? '...' : ''}`);
      });
    }

    if (allHrefsWithPattern && allHrefsWithPattern.length > 0 && listingLinks.length === 0) {
      console.warn(`\n⚠️  Found ${allHrefsWithPattern.length} "wohnung" links but 0 matched our listing pattern!`);
      console.warn(`   This might indicate a filtering issue or page structure change.`);
    }
    
    console.log(`\n✅ Page ${pageNum} summary: Found ${listingLinks.length} valid listing links`);
    if (listingLinks.length > 0) {
      console.log(`   Sample links (showing first 3):`);
      listingLinks.slice(0, 3).forEach((link, idx) => {
        console.log(`   ${idx + 1}. ${link}`);
      });
    } else {
      console.warn(`   ❌ No listing links found on page ${pageNum} - page may not have loaded correctly`);
      console.warn(`   Consider checking the screenshot or HTML file for debugging.`);
    }
    
    allLinks.push(...listingLinks);
    console.log(`   Total links collected so far: ${allLinks.length}`);
    
    // Add a small delay between pages to be respectful
    if (pageNum < pagesToScrape) {
      console.log(`\n⏳ Waiting 1 second before next page...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Remove duplicates
  const uniqueLinks = [...new Set(allLinks)];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Link Collection Complete`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   • Total links collected: ${allLinks.length}`);
  console.log(`   • Unique links (after deduplication): ${uniqueLinks.length}`);
  console.log(`   • Duplicates removed: ${allLinks.length - uniqueLinks.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (uniqueLinks.length === 0) {
    console.error(`❌ No listing links found! Aborting detail page scraping.`);
    await browser.close();
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏠 Starting Detail Page Scraping`);
  console.log(`${'='.repeat(60)}\n`);

  const listings = [];
  const errors = [];
  const skipped = [];

  for (const [i, link] of uniqueLinks.entries()) {
    console.log(`\n${'-'.repeat(60)}`);
    console.log(`📄 Processing listing ${i + 1}/${uniqueLinks.length}`);
    console.log(`🔗 URL: ${link}`);
    console.log(`${'-'.repeat(60)}`);
    
    const detailPage = await browser.newPage();
    detailPage.setDefaultNavigationTimeout(20000);
    detailPage.setDefaultTimeout(15000);
    try {
      console.log(`⏳ Navigating to detail page...`);
      await Promise.race([
        detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout after 20s')), 20000)
        )
      ]);
      console.log(`✓ Page navigation complete`);
      
      // Short wait for content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`⏳ Waiting for content selector (.info)...`);
      await Promise.race([
        detailPage.waitForSelector('.info', { timeout: 3000 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Selector timeout after 3s')), 3000)
        )
      ]);
      console.log(`✓ Content selector found`);
      
      if (i === 0) {
        console.log(`💾 Saving first detail page HTML for debugging...`);
        const html = await detailPage.content();
        require('fs').writeFileSync('first_detail_page.html', html);
        console.log(`✓ Saved first_detail_page.html (${(html.length / 1024).toFixed(2)} KB)`);
      }
      console.log(`🔍 Extracting data from page...`);
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
      console.log(`✓ Data extraction complete`);
      
      // Check for required fields
      const requiredFields = ['link', 'coldRent', 'rooms', 'squareMeters', 'title', 'district', 'type'];
      const missing = requiredFields.filter(f => !(data[f]) && data[f] !== 0);
      
      console.log(`\n📋 Extracted data for listing ${i + 1}:`);
      console.log(`   • Title: ${data.title || 'MISSING'}`);
      console.log(`   • District: ${data.district || 'MISSING'}`);
      console.log(`   • Type: ${data.type || 'MISSING'}`);
      console.log(`   • Cold Rent: ${data.coldRent || 'MISSING'}`);
      console.log(`   • Rooms: ${data.rooms || 'MISSING'}`);
      console.log(`   • Square Meters: ${data.squareMeters || 'MISSING'}`);
      console.log(`   • Images: ${data.images?.length || 0} found`);
      console.log(`   • Description length: ${data.description?.length || 0} chars`);
      console.log(`   • Offered description length: ${data.offeredDescription?.length || 0} chars`);
      console.log(`   • Looking for description length: ${data.lookingForDescription?.length || 0} chars`);
      
      if (missing.length > 0) {
        console.warn(`\n⚠️  SKIPPING listing ${i + 1} - Missing required fields: ${missing.join(', ')}`);
        console.warn(`   Link: ${link}`);
        skipped.push({ link, missing, data });
        await detailPage.close();
        continue;
      }
      
      console.log(`✓ All required fields present`);
      listings.push(data);
      console.log(`✅ Successfully processed listing ${i + 1}/${uniqueLinks.length}`);
    } catch (e) {
      console.error(`\n❌ ERROR scraping listing ${i + 1}:`);
      console.error(`   Link: ${link}`);
      console.error(`   Error: ${e.message}`);
      console.error(`   Stack: ${e.stack}`);
      errors.push({ link, error: e.message });
    } finally {
      await detailPage.close();
      console.log(`✓ Closed detail page`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Scraping Complete`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   ✅ Successfully scraped: ${listings.length} listings`);
  console.log(`   ⚠️  Skipped (missing fields): ${skipped.length} listings`);
  console.log(`   ❌ Errors: ${errors.length} listings`);
  console.log(`   📄 Total processed: ${uniqueLinks.length} listings`);
  console.log(`${'='.repeat(60)}\n`);

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped listings (${skipped.length}):`);
    skipped.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.link}`);
      console.log(`      Missing: ${item.missing.join(', ')}`);
    });
  }

  if (errors.length > 0) {
    console.log(`\n❌ Error details (${errors.length}):`);
    errors.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.link}`);
      console.log(`      Error: ${item.error}`);
    });
  }

  console.log(`\n💾 Saving results to berlin_listings.json...`);
  fs.writeFileSync('berlin_listings.json', JSON.stringify(listings, null, 2));
  const fileSize = (fs.statSync('berlin_listings.json').size / 1024).toFixed(2);
  console.log(`✓ Saved berlin_listings.json (${fileSize} KB)`);
  
  console.log(`\n🔚 Closing browser...`);
  await browser.close();
  console.log(`✅ Scraper finished successfully!`);
  console.log(`📊 Final count: ${listings.length} valid listings saved to berlin_listings.json\n`);
}

scrapeTauschwohnungBerlin().catch(console.error); 
