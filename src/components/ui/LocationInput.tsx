'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

type LocationResult = {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
};

type LocationInputProps = {
  onSelect: (result: LocationResult) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const searchCache = new Map<string, LocationResult[]>();
const CACHE_MAX = 40;

export function LocationInput({
  onSelect,
  onInputChange,
  placeholder = '会場名を入力...',
  className = '',
}: LocationInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    const normalized = q.trim();
    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const cached = searchCache.get(normalized);
    if (cached) {
      setResults(cached);
      setShowDropdown(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/location-search?q=${encodeURIComponent(normalized)}`,
        { signal: controller.signal }
      );
      const data: LocationResult[] = await res.json();
      if (!controller.signal.aborted) {
        searchCache.set(normalized, data);
        if (searchCache.size > CACHE_MAX) {
          const firstKey = searchCache.keys().next().value;
          if (firstKey) searchCache.delete(firstKey);
        }
        setResults(data);
        setShowDropdown(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!controller.signal.aborted) setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    onInputChange?.(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 500);
  };

  const handleSelect = (result: LocationResult) => {
    setQuery(result.shortName);
    setSelected(result);
    setShowDropdown(false);
    onInputChange?.(result.shortName);
    onSelect(result);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full h-12 bg-gray-50 border-none rounded-xl pl-10 pr-4 focus:ring-2 outline-none font-bold text-[#222222]"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none"
              >
                <p className="text-[13px] font-black text-[#222222] truncate">{r.shortName}</p>
                <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{r.address}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="text-[10px] text-gray-400 font-medium mt-1 ml-1 truncate">
          📍 {selected.address}
        </p>
      )}
    </div>
  );
}
