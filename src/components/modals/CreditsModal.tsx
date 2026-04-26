import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, Info, ExternalLink, Heart } from 'lucide-react';

type CreditsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreditsModal({ isOpen, onOpenChange }: CreditsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'credits' | 'terms' | 'privacy'>('credits');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl flex flex-col h-[85vh]">
        <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#ff385c] flex items-center justify-center shadow-lg shadow-[#ff385c]/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-[#222222] tracking-tight">クレジットと法務情報</DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">Oshi-Linkの運営・技術・規約について</DialogDescription>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('credits')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'credits' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              TECH CREDITS
            </button>
            <button 
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'terms' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              利用規約
            </button>
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'privacy' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              プライバシーポリシー
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'credits' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
                  <Info className="w-4 h-4" /> 使用ツール・オープンソース
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CreditItem name="Lucide React" desc="Icon set" url="https://lucide.dev" license="ISC" />
                  <CreditItem name="Shadcn UI" desc="UI Components" url="https://ui.shadcn.com" license="MIT" />
                  <CreditItem name="Next.js" desc="Web Framework" url="https://nextjs.org" license="MIT" />
                  <CreditItem name="Cloudflare" desc="D1 / Pages / Workers" url="https://cloudflare.com" />
                  <CreditItem name="Tailwind CSS" desc="CSS Framework" url="https://tailwindcss.com" license="MIT" />
                  <CreditItem name="date-fns" desc="Date utilities" url="https://date-fns.org" license="MIT" />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="prose prose-sm max-w-none space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TermSection title="第1条（適用）">
                本規約は、団体「TSUKURO!」（以下「当団体」）が提供するサービス「Oshi-Link」（以下「本サービス」）の利用条件を定めるものです。ユーザーは本サービスを利用することで、本規約に同意したものとみなされます。
              </TermSection>
              <TermSection title="第2条（禁止事項）">
                ユーザーは、以下の行為を行ってはなりません。
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>他のユーザーへの誹謗中傷、迷惑行為</li>
                  <li>本サービスの運営を妨げる行為</li>
                  <li>虚偽の情報を登録する行為</li>
                </ul>
              </TermSection>
              <TermSection title="第3条（免責事項）">
                本サービスは、提供する情報の正確性や完全性を保証するものではありません。情報の利用はユーザーの責任において行ってください。本サービスに関連して生じた損害について、当団体は一切の責任を負いません。
              </TermSection>
              <TermSection title="第4条（サービスの中断・停止）">
                当団体は、システムの保守、事故、その他必要と判断した場合には、予告なく本サービスの提供を中断または停止できるものとします。
              </TermSection>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="prose prose-sm max-w-none space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TermSection title="1. 取得する情報">
                本サービスは、Google OAuth、またはマジックリンク認証を通じて以下の情報を取得します。
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>メールアドレス</li>
                  <li>氏名（Googleアカウントの表示名）</li>
                  <li>プロフィール画像のURL（Googleアカウント）</li>
                </ul>
              </TermSection>
              <TermSection title="2. 利用目的">
                当団体は、取得した情報を以下の目的でのみ利用します。
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>本サービスへのログインおよび本人確認</li>
                  <li>サービス内でのユーザープロフィール（名前・アイコン）の表示</li>
                  <li>重要なシステム通知の送信</li>
                  <li>不正利用の防止</li>
                </ul>
              </TermSection>
              <TermSection title="3. 情報の管理と安全対策">
                ユーザー情報は、暗号化通信（SSL/TLS）を用いて保護され、セキュアなデータベース（Cloudflare D1）にて安全に保管されます。
              </TermSection>
              <TermSection title="4. 第三者への開示">
                法令に基づく場合を除き、当団体がユーザーの同意なしに個人情報を第三者に提供・販売することはありません。
              </TermSection>
              <TermSection title="5. データの削除">
                ユーザーは、アカウントの削除を希望する場合、当団体のお問い合わせ窓口（または公式SNS等）より申請することができます。
              </TermSection>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 text-center">
          <p className="text-[12px] text-gray-400 font-bold flex items-center justify-center gap-1.5 uppercase tracking-widest leading-none mb-2">
            Presented by <span className="text-[#ff385c]">TSUKURO!</span>
          </p>
          <p className="text-[10px] text-gray-300 font-medium">© 2026 TSUKURO! All rights reserved.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TermSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[14px] font-black text-[#222222]">{title}</h4>
      <div className="text-[13px] text-gray-600 leading-relaxed font-medium">
        {children}
      </div>
    </div>
  );
}

function CreditItem({ name, desc, url, license }: { name: string; desc: string; url: string; license?: string }) {
  return (
    <div className="p-4 rounded-[20px] bg-white border border-gray-100 hover:border-[#ff385c]/30 transition-all group">
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


