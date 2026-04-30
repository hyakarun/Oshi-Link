'use client';
import React from 'react';

type AdBannerProps = {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
};

export function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const adRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // slot (adspot ID) がある場合のみi-mobileを起動
    if (slot && adRef.current) {
      // 既存の広告をクリア
      adRef.current.innerHTML = '';
      
      const script1 = document.createElement('script');
      script1.type = 'text/javascript';
      script1.innerHTML = `
        var imobile_tag_ver = "4.0";
        var imobile_pindata = {"adspot":"${slot}", "pname":"oshi-link", "width":"300", "height":"250"};
      `;
      
      const script2 = document.createElement('script');
      script2.type = 'text/javascript';
      script2.src = 'https://spad.i-mobile.co.jp/script/ads.js?20101001';
      
      adRef.current.appendChild(script1);
      adRef.current.appendChild(script2);
    }
  }, [slot]);
  
  return (
    <div className={`w-full overflow-hidden flex flex-col items-center justify-center ${className}`}>
      <div ref={adRef} className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[120px] group hover:bg-gray-100 transition-colors">
        {!slot && (
          <>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Sponsored</p>
            <div className="text-[9px] text-gray-400 font-medium text-center leading-tight">
              i-mobile 広告枠<br/>
              (管理画面のadspot IDを設定してください)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
