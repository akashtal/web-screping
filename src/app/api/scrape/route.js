import puppeteer from 'puppeteer';
import { extractEmails } from '@/utils/extractEmails';
import { extractPhones } from '@/utils/extractPhones';
import selectors from '@/config/selectors';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
    responseLimit: '8mb',
    externalResolver: true,
  },
  maxDuration: 300, // 5 minutes max execution time
};

// Enhanced utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const extractTechStack = (content) => {
  const techKeywords = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'PHP', 'Ruby',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'Elasticsearch', 'Jenkins', 'GitHub', 'GitLab'
  ];
  const found = [];
  const lowerContent = content.toLowerCase();
  techKeywords.forEach(tech => {
    if (lowerContent.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  });
  return [...new Set(found)]; // Remove duplicates
};

const extractIndustry = (content) => {
  const industries = [
    'fintech', 'healthcare', 'education', 'e-commerce', 'saas', 'manufacturing',
    'consulting', 'marketing', 'real estate', 'automotive', 'retail', 'logistics'
  ];
  const lowerContent = content.toLowerCase();
  return industries.find(industry => lowerContent.includes(industry)) || 'Unknown';
};

export async function POST(req) {
  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { urls, extractionLevel = 'basic' } = requestBody;
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'No URLs provided or invalid format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const validUrls = urls.filter(url => {
      if (!isValidUrl(url)) {
        console.warn(`Invalid URL skipped: ${url}`);
        return false;
      }
      return true;
    });
    if (validUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid URLs provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let browser;
    const results = [];
    const maxRetries = 2;
    try {
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      for (const [index, url] of validUrls.entries()) {
        let attempt = 0;
        let success = false;
        let result = {
          companyName: null,
          website: url,
          emails: [],
          phones: [],
          error: null
        };
        while (attempt < maxRetries && !success) {
          let page;
          try {
            page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            if (selectors.waitFor) {
              try {
                await page.waitForSelector(selectors.waitFor, { timeout: 5000 });
              } catch (e) {
                console.warn(`Wait selector not found for ${url}: ${selectors.waitFor}`);
              }
            }
            await delay(2000);
            const content = await page.content();
            const bodyText = await page.$eval('body', el => el.innerText).catch(() => '');
            const emails = extractEmails(content);
            const phones = extractPhones(content);
            const companyData = await page.evaluate((selectors) => {
              const getMeta = (name) =>
                document.querySelector(`meta[name="${name}"]`)?.content ||
                document.querySelector(`meta[property="${name}"]`)?.content ||
                document.querySelector(`meta[property="og:${name}"]`)?.content || '';
              const getTextContent = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.innerText.trim() : '';
              };
              const companyNameSelectors = [
                selectors.companyName,
                'h1',
                '.company-name',
                '.brand-name',
                '[data-testid="company-name"]'
              ].filter(Boolean);
              let companyName = '';
              for (const selector of companyNameSelectors) {
                const name = getTextContent(selector);
                if (name && name.length > 0 && name.length < 100) {
                  companyName = name;
                  break;
                }
              }
              if (!companyName) {
                const title = document.querySelector('title')?.innerText || '';
                companyName = title.split(' - ')[0].split(' | ')[0];
              }
              return {
                companyName: companyName.trim(),
                title: document.querySelector('title')?.innerText || '',
                description: getMeta('description') || getMeta('og:description'),
                keywords: getMeta('keywords'),
                linkedin: document.querySelector('a[href*="linkedin.com"]')?.href || '',
                twitter: document.querySelector('a[href*="twitter.com"]')?.href || 
                         document.querySelector('a[href*="x.com"]')?.href || '',
                facebook: document.querySelector('a[href*="facebook.com"]')?.href || '',
                instagram: document.querySelector('a[href*="instagram.com"]')?.href || '',
              };
            }, selectors);
            result = {
              companyName: companyData.companyName || 'Unknown Company',
              website: url,
              emails: emails.slice(0, 10),
              phones: phones.slice(0, 5),
              error: null
            };
            if (extractionLevel === 'medium' || extractionLevel === 'advanced') {
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
            if (extractionLevel === 'advanced') {
              result.techStack = extractTechStack(bodyText);
              result.pageTitle = companyData.title;
              result.estimatedEmployeeCount = bodyText.match(/(\d+)[\s-]*employees?/i)?.[1] || null;
              result.foundedYear = bodyText.match(/founded[\s:]*(\d{4})/i)?.[1] || 
                                 bodyText.match(/since[\s:]*(\d{4})/i)?.[1] || null;
              const serviceKeywords = ['services', 'solutions', 'products', 'offerings'];
              const serviceMatches = [];
              serviceKeywords.forEach(keyword => {
                const regex = new RegExp(`${keyword}[\\s\\S]{0,200}`, 'gi');
                const matches = bodyText.match(regex);
                if (matches) serviceMatches.push(...matches);
              });
              result.services = serviceMatches.slice(0, 3);
            }
            success = true;
          } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed for ${url}:`, error.message);
            if (attempt >= maxRetries) {
              result.error = `Failed after ${maxRetries} attempts: ${error.message}`;
            } else {
              await delay(1000 * attempt);
            }
          } finally {
            if (page) {
              try {
                await page.close();
              } catch (closeError) {
                console.error('Error closing page:', closeError);
              }
            }
          }
        }
        results.push(result);
        if (index < validUrls.length - 1) {
          await delay(1000 + Math.random() * 2000);
        }
      }
    } catch (error) {
      console.error('Browser setup error:', error);
      return new Response(JSON.stringify({ 
        error: 'Browser initialization failed',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }
    try {
      const summary = {
        totalProcessed: results.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        companiesWithEmails: results.filter(r => r.emails && r.emails.length > 0).length,
        companiesWithPhones: results.filter(r => r.phones && r.phones.length > 0).length
      };
      const responseData = { 
        results,
        summary,
        extractionLevel,
        timestamp: new Date().toISOString()
      };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (jsonError) {
      console.error('Error serializing response:', jsonError);
      return new Response(JSON.stringify({
        error: 'Failed to serialize response data',
        details: jsonError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (outerError) {
    console.error('Unexpected error in POST handler:', outerError);
    return new Response(JSON.stringify({
      error: 'Unexpected error',
      details: outerError.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}