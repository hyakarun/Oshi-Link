import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, Info, ExternalLink } from 'lucide-react';

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

          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-full">
            <button 
              onClick={() => setActiveTab('credits')}
              className={`flex-1 px-2 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all leading-tight ${activeTab === 'credits' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              TECH<br />CREDITS
            </button>
            <button 
              onClick={() => setActiveTab('terms')}
              className={`flex-1 px-2 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all leading-tight ${activeTab === 'terms' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              利用規約
            </button>
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 px-2 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all leading-tight ${activeTab === 'privacy' ? 'bg-white text-[#ff385c] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              プライバシー<br />ポリシー
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'credits' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <Info className="w-4 h-4" /> Concept & Vision
                </h3>
                <div className="p-6 rounded-[24px] bg-gradient-to-br from-[#ff385c]/5 to-[#ff385c]/10 border border-[#ff385c]/10">
                  <p className="text-[14px] font-black text-[#222222] mb-2">推し活の「今」を、みんなで形にする。</p>
                  <p className="text-[12px] text-gray-600 leading-relaxed font-medium">
                    Oshi-Linkは、点在する推しのスケジュールを一つの場所に集約し、コミュニティの力で情報の正確性を担保する共同編集プラットフォームです。
                    100ptの承認で「確定」、50ptの不正確票で「虚偽」と判定する独自のレピュテーションシステムにより、信頼できるカレンダーを構築します。
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <Info className="w-4 h-4" /> Development Partners
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CreditItem name="Antigravity" desc="AI Coding Agent (Google Deepmind)" url="https://deepmind.google" />
                  <CreditItem name="hyakarun" desc="Lead Developer & Designer" url="https://github.com/hyakarun" />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <Info className="w-4 h-4" /> Infrastructure & Libraries
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CreditItem name="Cloudflare D1" desc="Transactional SQLite DB" url="https://cloudflare.com" />
                  <CreditItem name="Next.js 16" desc="Full-stack Web Framework" url="https://nextjs.org" />
                  <CreditItem name="Lucide React" desc="Premium Icon Set" url="https://lucide.dev" />
                  <CreditItem name="date-fns" desc="Timezone Utilities" url="https://date-fns.org" />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="prose prose-sm max-w-none space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TermSection title="第1条（適用）">
                本規約は、団体「TSUKURO!」（以下「当団体」）が提供するサービス「Oshi-Link」（以下「本サービス」）の利用条件を定めるものです。
              </TermSection>
              <TermSection title="第2条（情報の信頼性と投稿制限）">
                本サービスはコミュニティによる共同編集制を採用しています。
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>投稿された予定は、他のユーザーの投票（100pt）によって「確定」となります。</li>
                  <li>不正確票が50ptに達した投稿は「虚偽情報」としてマークされます。</li>
                  <li>虚偽情報と判定された投稿が3件以上に達したユーザーは、自動的に新規投稿機能が制限されます。</li>
                </ul>
              </TermSection>
              <TermSection title="第3条（禁止事項）">
                ユーザーは、以下の行為を行ってはなりません。
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>意図的に誤った情報を投稿し、他のユーザーを混乱させる行為</li>
                  <li>同一ユーザーによる複数アカウントを用いた不正な投票操作</li>
                  <li>他のユーザーへの誹謗中傷、嫌がらせ、またはプライバシーを侵害する行為</li>
                </ul>
              </TermSection>
              <TermSection title="第4条（免責事項）">
                本サービスは、提供する情報の正確性を保証するものではありません。情報の利用はユーザー自身の責任において行ってください。
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


