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
  placeholder?: string;
  className?: string;
};

export function LocationInput({ onSelect, placeholder = '会場名を入力...', className = '' }: LocationInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/location-search?q=${encodeURIComponent(q)}`);
      const data: LocationResult[] = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: LocationResult) => {
    setQuery(result.shortName);
    setSelected(result);
    setShowDropdown(false);
    onSelect(result);
  };

  // 外側クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

      {/* 選択済みの住所を薄く表示 */}
      {selected && (
        <p className="text-[10px] text-gray-400 font-medium mt-1 ml-1 truncate">
          📍 {selected.address}
        </p>
      )}
    </div>
  );
}
