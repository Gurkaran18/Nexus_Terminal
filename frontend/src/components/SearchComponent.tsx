import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType?: string;
}

interface SearchComponentProps {
  onAdd: (symbol: string, name: string) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({ onAdd }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/market/search/${query}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="relative w-full max-w-xl mx-auto mb-8 z-50">
      <div className="relative flex items-center">
        <Search className="absolute left-4 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for stocks, ETFs, or symbols..."
          className="w-full bg-[#1e293b]/80 border border-white/10 rounded-full py-3 pl-12 pr-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md shadow-lg"
        />
        <div className="absolute right-4 flex items-center gap-2">
          {isLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white/5 border border-white/10 px-2 py-1 rounded">
            <span className="text-[10px]">⌘</span>K
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {results.map((result) => (
            <div key={result.symbol} className="px-6 py-3 hover:bg-white/5 flex justify-between items-center transition-colors">
              <div 
                className="cursor-pointer flex-grow" 
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  navigate(`/asset/${result.symbol}`);
                }}
              >
                <div className="font-semibold text-gray-200">{result.symbol}</div>
                <div className="text-xs text-gray-400">{result.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                  {result.exchange}
                </span>
                <button 
                  onClick={() => onAdd(result.symbol, result.name)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded transition-colors"
                  title="Add to Watchlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
