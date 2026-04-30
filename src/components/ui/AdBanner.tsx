'use client';
import React from 'react';

type AdBannerProps = {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
};

export function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  // 実際の広告タグ（AdSenseやi-mobile）をここに流し込めるようにします
  // 現時点では、プレースホルダーとしてスタイリッシュなダミーを表示します
  
  return (
    <div className={`w-full overflow-hidden flex flex-col items-center justify-center ${className}`}>
      <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[100px] group hover:bg-gray-100 transition-colors cursor-help">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Sponsored</p>
        <div className="text-[9px] text-gray-400 font-medium text-center leading-tight">
          ここに広告が表示されます<br/>
          (AdSense / i-mobile)
        </div>
        
        {/* 実際のタグを入れる場合はここに <ins> や <script> を挿入します */}
      </div>
    </div>
  );
}
