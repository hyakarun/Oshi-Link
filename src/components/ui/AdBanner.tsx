'use client';
import React from 'react';

type AdBannerProps = {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
  premiumStatus?: 'free' | 'onetime' | 'pro';
};

export function AdBanner({ slot, format = 'auto', className = '', premiumStatus }: AdBannerProps) {
  const adRef = React.useRef<HTMLDivElement>(null);

  // pro（月額）またはonetime（広告非表示買い切り）ユーザーには広告を非表示
  if (premiumStatus === 'pro' || premiumStatus === 'onetime') {
    return null;
  }

  React.useEffect(() => {
    if (slot && adRef.current) {
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

  // 審査通過後: return <div ref={adRef} className={className} />;
  return null;
}
