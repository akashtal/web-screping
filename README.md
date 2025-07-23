# Company Data Scraper (Next.js + Puppeteer)

A modern web application for scraping company information from websites using Puppeteer, with a user-friendly Next.js frontend. Extract company names, emails, phones, social media, tech stack, and more at various detail levels.

---

##  Features
- **Easy-to-use UI**: Paste URLs, select extraction level, and get results in seconds.
- **Flexible Extraction**: Choose Basic, Medium, or Advanced data extraction.
- **Bulk Scraping**: Process multiple company websites at once.
- **Export**: Download results as CSV or JSON.
- **Robust API**: Scraping logic powered by Puppeteer, with retries and error handling.

---

## Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd web-screping
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the App Locally
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

---

## How the API Works

### Endpoint
```
POST /api/scrape
```

### Request Body
Send a JSON object:
```json
{
  "urls": ["https://example.com", "https://another.com"],
  "extractionLevel": "basic" // or "medium" or "advanced"
}
```
- `urls`: Array of website URLs to scrape (required)
- `extractionLevel`: Level of detail (`basic`, `medium`, `advanced`). Default: `basic`.

### Response
Returns a JSON object:
```json
{
  "results": [
    {
      "companyName": "Example Inc.",
      "website": "https://example.com",
      "emails": ["info@example.com"],
      "phones": ["+1 555-123-4567"],
      "description": "...", // medium/advanced
      "socialMedia": { ... }, // medium/advanced
      "industry": "...", // medium/advanced
      "techStack": ["React", "Node.js"], // advanced
      "foundedYear": "2015", // advanced
      "services": ["services ..."] // advanced
      // ...
    },
    // ...
  ],
  "summary": {
    "totalProcessed": 2,
    "successful": 2,
    "failed": 0,
    "companiesWithEmails": 2,
    "companiesWithPhones": 1
  },
  "extractionLevel": "basic",
  "timestamp": "2025-07-23T14:00:00.000Z"
}
```

### Error Handling
- Returns HTTP 400 for invalid input (e.g., missing URLs).
- Returns HTTP 405 for unsupported methods.
- Returns HTTP 500 for server errors.
- Each result may include an `error` field if scraping failed for that URL.

---

##  How to Use the Frontend
1. **Enter URLs**: Paste one or more company website URLs (one per line).
2. **Select Extraction Level**: Choose Basic, Medium, or Advanced.
3. **Start Scraping**: Click "Start Scraping". Progress and results will appear below.
4. **Export**: Download results as CSV or JSON using the provided buttons.

---

##  Configuration & Environment
- **Node.js**: Requires Node.js 18+ (for Puppeteer and Next.js compatibility).
- **Puppeteer**: Uses a headless Chromium browser. No extra setup needed for most environments.
- **Selectors**: You can customize scraping selectors in `src/config/selectors.js`.
- **Timeouts**: API has a 5-minute max execution time per request.

---

##  Troubleshooting
- **405 Method Not Allowed**: Ensure you are sending a POST request to `/api/scrape`.
- **500 Internal Server Error**: Check your Node.js version and that Puppeteer can launch Chromium (some Linux servers may need extra dependencies).
- **No Results**: Make sure the URLs are valid and accessible from your server.
- **CORS Issues**: Not expected for local use, but if deploying, configure CORS as needed.

---

##  Project Structure
```
web-screping/
  src/
    app/
      api/
        scrape/route.js   # API route for scraping
      page.js            # Main frontend page
    config/selectors.js  # CSS selectors for scraping
    utils/               # Email/phone extraction helpers
  public/                # Static assets
  package.json           # Dependencies and scripts
  README.md              # This file
```

---

