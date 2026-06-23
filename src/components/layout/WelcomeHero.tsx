import React from 'react';
import { Users, Bell, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeHeroProps {
  onDiscover: () => void;
}

/** フォロー中カレンダーが0件のときに表示する歓迎ヒーロー */
export function WelcomeHero({ onDiscover }: WelcomeHeroProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div
        className="w-full max-w-4xl p-8 md:p-12 rounded-[40px] text-white shadow-2xl animate-in fade-in zoom-in duration-700 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 25%, #34A853 50%, #4285F4 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientMove 15s ease infinite'
        }}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

        <style jsx>{`
          @keyframes gradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Public Beta Test
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">
                Oshi-Link へ<br />ようこそ！
              </h2>
              <p className="text-lg text-white/90 font-medium leading-relaxed max-w-lg">
                推しの予定をみんなで共有・管理するカレンダーへようこそ。<br />
                まずは気になるグループをフォローして、あなただけのカレンダーを完成させましょう。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: <Users className="w-6 h-6" />, title: "共有", desc: "ファン全員で更新" },
                { icon: <Bell className="w-6 h-6" />, title: "通知", desc: "見逃しをゼロに" },
                { icon: <Calendar className="w-6 h-6" />, title: "信頼", desc: "不正確な情報を排除" },
              ].map((f, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md rounded-[24px] p-5 border border-white/10 hover:bg-white/20 transition-all cursor-default group">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-black mb-1">{f.title}</h3>
                  <p className="text-[11px] text-white/60 font-bold leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button
                onClick={onDiscover}
                className="h-14 px-10 bg-white text-[#6366f1] hover:bg-white/90 rounded-[20px] font-black text-base shadow-xl transition-all active:scale-[0.95] hover:shadow-2xl hover:-translate-y-0.5"
              >
                <Search className="w-5 h-5 mr-3" /> カレンダーを探しに行く
              </Button>
            </div>
          </div>

          <div className="hidden lg:block w-80 h-80 relative shrink-0">
            <div className="absolute inset-0 bg-white/10 rounded-[60px] rotate-12 animate-pulse" />
            <div className="absolute inset-0 bg-white/5 rounded-[60px] -rotate-6 animate-pulse delay-700" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Calendar className="w-40 h-40 text-white/20 rotate-12" />
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/20 rounded-3xl backdrop-blur-xl flex items-center justify-center animate-bounce">
                  <Search className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
