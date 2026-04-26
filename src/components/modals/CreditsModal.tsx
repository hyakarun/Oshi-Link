import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, Info, ExternalLink, Heart } from 'lucide-react';

type CreditsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreditsModal({ isOpen, onOpenChange }: CreditsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl">
        <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#ff385c] flex items-center justify-center shadow-lg shadow-[#ff385c]/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">クレジットと規約</DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">Oshi-Linkを支える技術と権利表記</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* Rights Attribution */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
              <Info className="w-4 h-4" /> 使用ツール・権利表記
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CreditItem 
                name="Lucide React" 
                desc="美しいアイコンセット" 
                url="https://lucide.dev"
                license="ISC License"
              />
              <CreditItem 
                name="Iconify" 
                desc="多様なアイコンフレームワーク" 
                url="https://iconify.design"
                license="MIT License"
              />
              <CreditItem 
                name="Shadcn UI" 
                desc="高品質なUIコンポーネント" 
                url="https://ui.shadcn.com"
                license="MIT License"
              />
              <CreditItem 
                name="Next.js" 
                desc="Reactフレームワーク" 
                url="https://nextjs.org"
                license="MIT License"
              />
              <CreditItem 
                name="Cloudflare" 
                desc="D1 / Pages / Workers" 
                url="https://cloudflare.com"
              />
              <CreditItem 
                name="Tailwind CSS" 
                desc="ユーティリティ優先CSS" 
                url="https://tailwindcss.com"
                license="MIT License"
              />
              <CreditItem 
                name="date-fns" 
                desc="モダンな日付操作ライブラリ" 
                url="https://date-fns.org"
                license="MIT License"
              />
            </div>
          </section>

          {/* Terms and Privacy Policy */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
              ⚖️ 利用規約・プライバシー
            </h3>
            <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-600 leading-relaxed font-medium space-y-4">
              <div>
                <p className="font-bold text-[#222222] mb-1">利用規約</p>
                <p>本サービスはファンの皆様のコミュニティ活動を支援するためのものです。不適切なコンテンツの投稿や、他者の権利を侵害する行為はお控えください。</p>
              </div>
              <div>
                <p className="font-bold text-[#222222] mb-1">免責事項</p>
                <p>掲載されているイベント情報の正確性については、最終的に公式情報をご確認ください。本サービス利用による損害について、運営者は責任を負いかねます。</p>
              </div>
              <div>
                <p className="font-bold text-[#222222] mb-1">データ利用</p>
                <p>Googleログインにより取得されるプロフィール情報は、アイコン表示とID識別のためにのみ使用されます。</p>
              </div>
            </div>
          </section>

          <div className="pt-4 text-center">
            <p className="text-[12px] text-gray-400 font-bold flex items-center justify-center gap-1.5 uppercase tracking-widest">
              Made with <Heart className="w-3 h-3 text-[#ff385c] fill-[#ff385c]" /> for Oshi-Katsu
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreditItem({ name, desc, url, license }: { name: string; desc: string; url: string; license?: string }) {
  return (
    <div className="p-4 rounded-[20px] bg-white border border-gray-100 hover:border-[#ff385c]/30 hover:shadow-lg transition-all group">
      <div className="flex items-center justify-between mb-1">
        <span className="font-black text-[#222222] text-sm">{name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-300 group-hover:text-[#ff385c]">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <p className="text-[11px] text-gray-500 font-medium">{desc}</p>
      {license && <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{license}</p>}
    </div>
  );
}
