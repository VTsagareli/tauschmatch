"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = __importStar(require("fs"));
puppeteer_extra_1.default.use(StealthPlugin());
const BASE_URL = 'https://www.tauschwohnung.com/suche/wohnung-mieten/berlin?page={PAGE}&order=standard&locationIds[regions]=&locationIds[cities]=3806&locationIds[areas]=&rentMax=&sizeMin=&roomsMin=1.0&housingType=1&properties=&housingProperties=&radius=&storeyMin=-1&storeyMax=10&propertySizeMin=&wgType=&requireImages=0';
function scrapeTauschwohnungBerlin() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_extra_1.default.launch({ headless: true });
        const page = yield browser.newPage();
        const allLinks = [];
        const pagesToScrape = 5; // Scrape 5 pages
        // Scrape multiple pages to get more listings
        for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
            const url = BASE_URL.replace('{PAGE}', pageNum.toString());
            console.log(`\n=== Scraping Page ${pageNum}/${pagesToScrape} ===`);
            console.log(`URL: ${url}`);
            yield page.goto(url, { waitUntil: 'networkidle2' });
            if (pageNum === 1) {
                console.log('Saving summary page HTML...');
                const summaryHtml = yield page.content();
                require('fs').writeFileSync('summary_page.html', summaryHtml);
                yield page.screenshot({ path: 'summary_page.png', fullPage: true });
            }
            // Get all listing links from this page
            const pageLinks = yield page.evaluate(() => {
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
                yield new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        // Remove duplicates
        const uniqueLinks = [...new Set(allLinks)];
        console.log(`\n=== Total unique listings found: ${uniqueLinks.length} ===`);
        const listings = [];
        for (const [i, link] of uniqueLinks.entries()) {
            console.log(`Processing listing ${i + 1}/${uniqueLinks.length}: ${link}`);
            const detailPage = yield browser.newPage();
            yield detailPage.goto(link, { waitUntil: 'networkidle2' });
            try {
                yield detailPage.waitForSelector('.info', { timeout: 7000 });
                console.log(`  ✓ Page loaded successfully`);
                if (i === 0) {
                    const html = yield detailPage.content();
                    require('fs').writeFileSync('first_detail_page.html', html);
                }
                const data = yield detailPage.evaluate(() => {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    const parseNumber = (str) => Number(str.replace(/[^\d,.]/g, '').replace(',', '.'));
                    const getText = (sel) => { var _a, _b; return ((_b = (_a = document.querySelector(sel)) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || ''; };
                    const getFeature = (key) => {
                        var _a, _b, _c, _d;
                        const dl = Array.from(document.querySelectorAll('.features-table dl'));
                        for (const d of dl) {
                            const dt = (_b = (_a = d.querySelector('dt')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                            const dd = (_d = (_c = d.querySelector('dd')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim();
                            if (dt === key)
                                return dd || '';
                        }
                        return '';
                    };
                    const getFeaturesList = () => {
                        const dl = Array.from(document.querySelectorAll('.features-table dl'));
                        return dl.map(d => {
                            var _a, _b, _c, _d;
                            const dt = (_b = (_a = d.querySelector('dt')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                            const dd = (_d = (_c = d.querySelector('dd')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim();
                            return dt && dd ? `${dt}: ${dd}` : '';
                        }).filter(Boolean);
                    };
                    // Main fields
                    const address = getText('.info address');
                    const district = ((_a = address.split(',')[1]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                    const type = getFeature('Typ') || getFeature('Objektart') || 'Apartment';
                    // Top info bar
                    const infoLis = document.querySelectorAll('.info ul li');
                    const coldRent = infoLis[0] ? parseNumber(((_b = infoLis[0].querySelector('div')) === null || _b === void 0 ? void 0 : _b.textContent) || '') : 0;
                    const rooms = infoLis[1] ? parseNumber(((_c = infoLis[1].querySelector('div')) === null || _c === void 0 ? void 0 : _c.textContent) || '') : 0;
                    const squareMeters = infoLis[2] ? parseNumber(((_d = infoLis[2].querySelector('div')) === null || _d === void 0 ? void 0 : _d.textContent) || '') : 0;
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
                    // Description
                    let description = '';
                    const descArticle = Array.from(document.querySelectorAll('article')).find(a => { var _a, _b; return (_b = (_a = a.querySelector('h2')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.includes('Beschreibung'); });
                    if (descArticle) {
                        description = ((_f = (_e = descArticle.querySelector('.content')) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || '';
                    }
                    // Contact name (if available)
                    let contactName = '';
                    const contactArticle = Array.from(document.querySelectorAll('article')).find(a => { var _a, _b; return (_b = (_a = a.querySelector('h2')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.match(/sucht|bietet/i); });
                    if (contactArticle) {
                        const h2 = (_h = (_g = contactArticle.querySelector('h2')) === null || _g === void 0 ? void 0 : _g.textContent) === null || _h === void 0 ? void 0 : _h.trim();
                        if (h2)
                            contactName = h2.replace(/\s+sucht.*|\s+bietet.*/i, '').trim();
                    }
                    // Link
                    const link = window.location.href;
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
                        contactName,
                        address,
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
                    yield detailPage.close();
                    continue;
                }
                console.log('✓ All required fields present');
                listings.push(data);
            }
            catch (e) {
                console.error(`  ✗ Failed to scrape ${link}:`, e);
            }
            finally {
                yield detailPage.close();
            }
        }
        fs.writeFileSync('berlin_listings.json', JSON.stringify(listings, null, 2));
        console.log(`Scraped ${listings.length} listings.`);
        yield browser.close();
    });
}
scrapeTauschwohnungBerlin().catch(console.error);
