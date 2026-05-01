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
  
  // 審査中・未設定のため一時的に非表示
  return null;
}
