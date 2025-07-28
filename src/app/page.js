"use client";
import { useState } from 'react';
import {
  Globe,
  Mail,
  Phone,
  Building,
  Download,
  FileText,
  Loader2,
  Search,
  ExternalLink,
  Twitter,
  Linkedin,
  Facebook,
  Code,
  Calendar,
  Tag,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

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

      if (!res.ok) {
        console.error('Response not OK:', res.status, res.statusText);

        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errorText = await res.text();
          console.error('Error response body:', errorText);

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (textError) {
          console.error('Could not read error response:', textError);
        }

        throw new Error(errorMessage);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        const responseText = await res.text();
        console.error('Response body:', responseText);
        throw new Error('Server returned non-JSON response');
      }

      const responseText = await res.text();
      console.log('Raw response:', responseText.substring(0, 500) + '...');

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Company Data Scraper
              </h1>
              <p className="text-gray-400 mt-1">Extract comprehensive company information with AI precision</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* URL Input Section */}
            <div className="lg:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                <Globe className="w-4 h-4" />
                URLs to Scrape (one per line)
              </label>
              <div className="relative">
                <textarea
                  rows={10}
                  placeholder="https://example.com&#10;https://company.com&#10;https://startup.io&#10;&#10;Paste your company URLs here..."
                  className="w-full bg-gray-900/50 border border-gray-600/50 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                  {urls.split('\n').filter(Boolean).length} URLs
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                <Settings className="w-4 h-4" />
                Extraction Level
              </label>
              <select
                value={extractionLevel}
                onChange={(e) => setExtractionLevel(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-600/50 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all mb-6"
              >
                <option value="basic">⚡ Basic (Fast & Essential)</option>
                <option value="medium">🔥 Medium (Balanced Details)</option>
                <option value="advanced">💎 Advanced (Complete Profile)</option>
              </select>

              <div className="bg-gray-900/30 border border-gray-700/30 p-5 rounded-xl">
                <h3 className="flex items-center gap-2 font-medium text-gray-300 mb-3">
                  <Search className="w-4 h-4" />
                  What will be extracted:
                </h3>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center gap-2 text-gray-400">
                    <Building className="w-3 h-3 text-blue-400" />
                    Company name and website
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <Mail className="w-3 h-3 text-green-400" />
                    Email addresses
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-3 h-3 text-yellow-400" />
                    Phone numbers
                  </li>
                  {(extractionLevel === 'medium' || extractionLevel === 'advanced') && (
                    <>
                      <li className="flex items-center gap-2 text-gray-400">
                        <Users className="w-3 h-3 text-purple-400" />
                        Social media profiles
                      </li>
                      <li className="flex items-center gap-2 text-gray-400">
                        <FileText className="w-3 h-3 text-indigo-400" />
                        Company description
                      </li>
                      <li className="flex items-center gap-2 text-gray-400">
                        <Tag className="w-3 h-3 text-pink-400" />
                        Industry classification
                      </li>
                    </>
                  )}
                  {extractionLevel === 'advanced' && (
                    <>
                      <li className="flex items-center gap-2 text-gray-400">
                        <Code className="w-3 h-3 text-orange-400" />
                        Technology stack
                      </li>
                      <li className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        Founded year
                      </li>
                      <li className="flex items-center gap-2 text-gray-400">
                        <TrendingUp className="w-3 h-3 text-red-400" />
                        Services offered
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-8">
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              onClick={handleScrape}
              disabled={loading || !urls.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Start Scraping
                </>
              )}
            </button>

            {results.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  Export JSON
                </button>
              </>
            )}
          </div>

          {/* Loading Progress */}
          {loading && (
            <div className="mt-6">
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Processing URLs...</span>
                      <span className="text-blue-400">{progress.current} of {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{summary.totalProcessed}</div>
              <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Building className="w-3 h-3" />
                Total Processed
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{summary.successful}</div>
              <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Successful
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">{summary.failed}</div>
              <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" />
                Failed
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{summary.companiesWithEmails}</div>
              <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" />
                With Emails
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400 mb-1">{summary.companiesWithPhones}</div>
              <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" />
                With Phones
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Results ({results.length})</h2>
            </div>

            <div className="grid gap-6">
              {results.map((r, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {r.companyName || 'Unknown Company'}
                        </h3>
                        {r.industry && (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded-full mt-1">
                            <Tag className="w-3 h-3" />
                            {r.industry}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs bg-gray-700/50 text-gray-400 px-3 py-1 rounded-full">
                      #{i + 1}
                    </span>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-400">Website:</span>
                        <a href={r.website} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors">
                          {r.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {r.emails.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-green-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Emails:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.emails.map((email, idx) => (
                                <span key={idx} className="bg-green-900/20 text-green-300 px-2 py-1 rounded text-xs">
                                  {email}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {r.phones.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Phones:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.phones.map((phone, idx) => (
                                <span key={idx} className="bg-yellow-900/20 text-yellow-300 px-2 py-1 rounded text-xs">
                                  {phone}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {r.foundedYear && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span className="text-gray-400">Founded:</span>
                          <span className="text-cyan-300">{r.foundedYear}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {r.description && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-indigo-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Description:</span>
                            <p className="text-gray-300 mt-1 text-xs leading-relaxed">
                              {r.description.substring(0, 150)}...
                            </p>
                          </div>
                        </div>
                      )}

                      {r.socialMedia && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-purple-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Social Media:</span>
                            <div className="flex gap-2 mt-1">
                              {r.socialMedia.linkedin && (
                                <a href={r.socialMedia.linkedin} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-blue-900/20 text-blue-300 hover:text-blue-200 px-2 py-1 rounded text-xs transition-colors">
                                  <Linkedin className="w-3 h-3" />
                                  LinkedIn
                                </a>
                              )}
                              {r.socialMedia.twitter && (
                                <a href={r.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-sky-900/20 text-sky-300 hover:text-sky-200 px-2 py-1 rounded text-xs transition-colors">
                                  <Twitter className="w-3 h-3" />
                                  Twitter
                                </a>
                              )}
                              {r.socialMedia.facebook && (
                                <a href={r.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-blue-900/20 text-blue-300 hover:text-blue-200 px-2 py-1 rounded text-xs transition-colors">
                                  <Facebook className="w-3 h-3" />
                                  Facebook
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {r.techStack && r.techStack.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Code className="w-4 h-4 text-orange-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Tech Stack:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.techStack.map((tech, idx) => (
                                <span key={idx} className="bg-orange-900/20 text-orange-300 px-2 py-1 rounded text-xs">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {r.services && r.services.length > 0 && (
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">Services:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.services.slice(0, 3).map((service, idx) => (
                                <span key={idx} className="bg-red-900/20 text-red-300 px-2 py-1 rounded text-xs">
                                  {service}
                                </span>
                              ))}
                              {r.services.length > 3 && (
                                <span className="text-gray-500 text-xs">+{r.services.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {r.error && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                      <div>
                        <span className="text-red-300 font-medium text-xs">Error:</span>
                        <p className="text-red-200 text-xs mt-1">{r.error}</p>
                      </div>
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