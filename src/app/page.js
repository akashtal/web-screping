"use client";
import { useState } from 'react';

export default function Home() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [extractionLevel, setExtractionLevel] = useState('basic');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleScrape = async () => {
    setLoading(true);
    setResults([]);
    setSummary(null);
    
    const urlList = urls.split('\n').filter(Boolean).map(url => url.trim());
    setProgress({ current: 0, total: urlList.length });

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls: urlList,
          extractionLevel 
        }),
      });
    
      // Check if response is ok first
      if (!res.ok) {
        console.error('Response not OK:', res.status, res.statusText);
        
        // Try to read response text for better error info
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errorText = await res.text();
          console.error('Error response body:', errorText);
          
          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            errorMessage = errorText || errorMessage;
          }
        } catch (textError) {
          console.error('Could not read error response:', textError);
        }
        
        throw new Error(errorMessage);
      }

      // Check content type
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        const responseText = await res.text();
        console.error('Response body:', responseText);
        throw new Error('Server returned non-JSON response');
      }

      // Get response text first to debug
      const responseText = await res.text();
      console.log('Raw response:', responseText.substring(0, 500) + '...');
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Response text length:', responseText.length);
        console.error('Response starts with:', responseText.substring(0, 100));
        console.error('Response ends with:', responseText.substring(responseText.length - 100));
        throw new Error('Invalid JSON response from server');
      }

      setResults(data.results || []);
      setSummary(data.summary || null);
      setProgress({ current: data.results?.length || 0, total: data.results?.length || 0 });
      
    } catch (err) {
      console.error('Scrape Error:', err);
      alert(`Failed to scrape URLs: ${err.message}`);
    }
    
    setLoading(false);
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = ['Company Name', 'Website', 'Emails', 'Phones'];
    if (extractionLevel === 'medium' || extractionLevel === 'advanced') {
      headers.push('Description', 'LinkedIn', 'Twitter', 'Industry');
    }
    if (extractionLevel === 'advanced') {
      headers.push('Tech Stack', 'Founded Year', 'Services');
    }

    const csvContent = [
      headers.join(','),
      ...results.map(r => {
        const basicRow = [
          `"${r.companyName || ''}"`,
          `"${r.website || ''}"`,
          `"${r.emails.join('; ')}"`,
          `"${r.phones.join('; ')}"`
        ];

        if (extractionLevel === 'medium' || extractionLevel === 'advanced') {
          basicRow.push(
            `"${r.description || ''}"`,
            `"${r.socialMedia?.linkedin || ''}"`,
            `"${r.socialMedia?.twitter || ''}"`,
            `"${r.industry || ''}"`
          );
        }

        if (extractionLevel === 'advanced') {
          basicRow.push(
            `"${r.techStack?.join('; ') || ''}"`,
            `"${r.foundedYear || ''}"`,
            `"${r.services?.join('; ') || ''}"`
          );
        }

        return basicRow.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (results.length === 0) return;

    const jsonContent = JSON.stringify({
      extractionLevel,
      timestamp: new Date().toISOString(),
      summary,
      results
    }, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Company Data Scraper</h1>
          <p className="text-gray-600 mb-6">Extract company information from websites with configurable detail levels</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URLs to Scrape (one per line)
              </label>
              <textarea
                rows={8}
                placeholder="https://example.com&#10;https://company.com&#10;https://startup.io"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extraction Level
              </label>
              <select
                value={extractionLevel}
                onChange={(e) => setExtractionLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic (Name, Website, Contact)</option>
                <option value="medium">Medium (+ Social Media, Description)</option>
                <option value="advanced">Advanced (+ Tech Stack, Services)</option>
              </select>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-800 mb-2">What will be extracted:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Company name and website</li>
                  <li>• Email addresses and phone numbers</li>
                  {(extractionLevel === 'medium' || extractionLevel === 'advanced') && (
                    <>
                      <li>• Social media profiles</li>
                      <li>• Company description and industry</li>
                    </>
                  )}
                  {extractionLevel === 'advanced' && (
                    <>
                      <li>• Technology stack</li>
                      <li>• Founded year and services</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleScrape}
              disabled={loading || !urls.trim()}
            >
              {loading ? 'Scraping...' : 'Start Scraping'}
            </button>
            
            {results.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Export JSON
                </button>
              </>
            )}
          </div>

          {loading && (
            <div className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800">
                    Processing {progress.current} of {progress.total} URLs...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {summary && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalProcessed}</div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.companiesWithEmails}</div>
                <div className="text-sm text-gray-600">With Emails</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.companiesWithPhones}</div>
                <div className="text-sm text-gray-600">With Phones</div>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Results ({results.length})</h2>
            <div className="space-y-4">
              {results.map((r, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {r.companyName || 'Unknown Company'}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong className="text-gray-700">Website:</strong> 
                        <a href={r.website} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-600 hover:underline ml-1">{r.website}</a>
                      </p>
                      
                      {r.emails.length > 0 && (
                        <p><strong className="text-gray-700">Emails:</strong> 
                          <span className="ml-1">{r.emails.join(', ')}</span>
                        </p>
                      )}
                      
                      {r.phones.length > 0 && (
                        <p><strong className="text-gray-700">Phones:</strong> 
                          <span className="ml-1">{r.phones.join(', ')}</span>
                        </p>
                      )}
                      
                      {r.industry && (
                        <p><strong className="text-gray-700">Industry:</strong> 
                          <span className="ml-1 capitalize">{r.industry}</span>
                        </p>
                      )}
                    </div>
                    
                    <div>
                      {r.description && (
                        <p><strong className="text-gray-700">Description:</strong> 
                          <span className="ml-1 text-gray-600">{r.description.substring(0, 150)}...</span>
                        </p>
                      )}
                      
                      {r.socialMedia && (
                        <div className="mt-2">
                          <strong className="text-gray-700">Social Media:</strong>
                          <div className="flex gap-2 mt-1">
                            {r.socialMedia.linkedin && (
                              <a href={r.socialMedia.linkedin} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-700 hover:underline text-xs">LinkedIn</a>
                            )}
                            {r.socialMedia.twitter && (
                              <a href={r.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-500 hover:underline text-xs">Twitter</a>
                            )}
                            {r.socialMedia.facebook && (
                              <a href={r.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-800 hover:underline text-xs">Facebook</a>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {r.techStack && r.techStack.length > 0 && (
                        <p className="mt-2"><strong className="text-gray-700">Tech Stack:</strong> 
                          <span className="ml-1">{r.techStack.join(', ')}</span>
                        </p>
                      )}
                      
                      {r.foundedYear && (
                        <p><strong className="text-gray-700">Founded:</strong> 
                          <span className="ml-1">{r.foundedYear}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {r.error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      <strong>Error:</strong> {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}