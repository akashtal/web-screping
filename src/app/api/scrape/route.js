import puppeteer from 'puppeteer';
import { extractEmails } from '@/utils/extractEmails';
import { extractPhones } from '@/utils/extractPhones';
import selectors from '@/config/selectors';

// API config (increase limits for large websites)
export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: '8mb',
    externalResolver: true
  },
  maxDuration: 300 // 5 minutes
};

// Utility: delay execution
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Utility: validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Utility: extract technologies from content
const extractTechStack = (content) => {
  const keywords = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'PHP', 'Ruby',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'Elasticsearch', 'Jenkins', 'GitHub', 'GitLab'
  ];
  const lower = content.toLowerCase();
  return [...new Set(keywords.filter(k => lower.includes(k.toLowerCase())))];
};

// Utility: guess industry
const extractIndustry = (content) => {
  const industries = [
    'fintech', 'healthcare', 'education', 'e-commerce', 'saas', 'manufacturing',
    'consulting', 'marketing', 'real estate', 'automotive', 'retail', 'logistics'
  ];
  const lower = content.toLowerCase();
  return industries.find(ind => lower.includes(ind)) || 'Unknown';
};

// Main API handler
export async function POST(req) {
  try {
    // Parse request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (err) {
      return errorResponse('Invalid request body', 400);
    }

    const { urls, extractionLevel = 'basic' } = requestBody;
    if (!Array.isArray(urls) || urls.length === 0) {
      return errorResponse('No URLs provided or invalid format', 400);
    }

    const validUrls = urls.filter(isValidUrl);
    if (validUrls.length === 0) {
      return errorResponse('No valid URLs provided', 400);
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];

    for (const [index, url] of validUrls.entries()) {
      const result = await scrapeWebsite(browser, url, extractionLevel);
      results.push(result);
      if (index < validUrls.length - 1) {
        await delay(1000 + Math.random() * 1000);
      }
    }

    await browser.close();

    const summary = {
      totalProcessed: results.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      companiesWithEmails: results.filter(r => r.emails?.length).length,
      companiesWithPhones: results.filter(r => r.phones?.length).length
    };

    return jsonResponse({ results, summary, extractionLevel, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Unexpected error', 500, err.message);
  }
}

// Handle scraping of a single website
async function scrapeWebsite(browser, url, level) {
  const result = {
    companyName: null,
    website: url,
    emails: [],
    phones: [],
    error: null
  };

  const maxRetries = 2;
  let attempt = 0;

  

  while (attempt < maxRetries) {
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      if (selectors.waitFor) {
        try {
          await page.waitForSelector(selectors.waitFor, { timeout: 5000 });
        } catch (e) {
          console.warn(`No wait selector found for ${url}`);
        }
      }

      await delay(2000);

      const content = await page.content();
      const bodyText = await page.$eval('body', el => el.innerText).catch(() => '');

      result.emails = extractEmails(content).slice(0, 10);
      result.phones = extractPhones(content).slice(0, 5);

      const companyData = await page.evaluate((selectors) => {
        const getMeta = (name) =>
          document.querySelector(`meta[name="${name}"]`)?.content ||
          document.querySelector(`meta[property="${name}"]`)?.content ||
          document.querySelector(`meta[property="og:${name}"]`)?.content || '';

        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el?.innerText.trim() || '';
        };

        const nameSelectors = [
          selectors.companyName,
          'h1',
          '.company-name',
          '.brand-name',
          '[data-testid="company-name"]'
        ].filter(Boolean);

        let name = nameSelectors.map(getText).find(n => n && n.length < 100) || '';
        if (!name) {
          const title = document.querySelector('title')?.innerText || '';
          name = title.split(/[-|]/)[0].trim();
        }

        return {
          companyName: name,
          title: document.querySelector('title')?.innerText || '',
          description: getMeta('description'),
          keywords: getMeta('keywords'),
          linkedin: document.querySelector('a[href*="linkedin.com"]')?.href || '',
          twitter: document.querySelector('a[href*="twitter.com"], a[href*="x.com"]')?.href || '',
          facebook: document.querySelector('a[href*="facebook.com"]')?.href || '',
          instagram: document.querySelector('a[href*="instagram.com"]')?.href || ''
        };
      }, selectors);

      result.companyName = companyData.companyName || 'Unknown Company';

      if (level !== 'basic') {
        result.description = companyData.description;
        result.socialMedia = {
          linkedin: companyData.linkedin,
          twitter: companyData.twitter,
          facebook: companyData.facebook,
          instagram: companyData.instagram
        };
        result.keywords = companyData.keywords;
        result.industry = extractIndustry(bodyText);
      }

      if (level === 'advanced') {
        result.techStack = extractTechStack(bodyText);
        result.pageTitle = companyData.title;
        result.estimatedEmployeeCount = bodyText.match(/(\d+)[\s-]*employees?/i)?.[1] || null;
        result.foundedYear = bodyText.match(/founded\s*[:\-]?\s*(\d{4})/i)?.[1]
          || bodyText.match(/since\s*[:\-]?\s*(\d{4})/i)?.[1] || null;

        const serviceKeywords = ['services', 'solutions', 'products', 'offerings'];
        const serviceMatches = serviceKeywords.flatMap(k => {
          const match = bodyText.match(new RegExp(`${k}[\\s\\S]{0,200}`, 'gi'));
          return match || [];
        });

        result.services = serviceMatches.slice(0, 3);
      }

      return result;

    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
      attempt++;
      if (attempt === maxRetries) {
        result.error = `Failed after ${maxRetries} attempts: ${err.message}`;
        return result;
      }
      await delay(1000 * attempt);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (err) {
          console.warn('Error closing page:', err.message);
        }
      }
    }
  }
}

// Random user-agent to avoid blocking
function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
    'Mozilla/5.0 (X11; Linux x86_64)...'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// Helper to send JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper for error responses
function errorResponse(msg, status = 500, details = null) {
  return jsonResponse({ error: msg, ...(details && { details }) }, status);
}
