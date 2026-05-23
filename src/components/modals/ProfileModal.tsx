import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { User, Group } from '@/lib/types';
import { Bell, Mail, Smartphone, Info, Sun, Moon, Laptop, Palette, BookOpen } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

type ProfileModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  followedGroups: Group[];
  handleProfileUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
  handleLogout: () => void;
  setIsCreditsOpen: (open: boolean) => void;
  loading: boolean;
};

export function ProfileModal({
  isOpen,
  onOpenChange,
  user,
  followedGroups,
  handleProfileUpdate,
  handleLogout,
  setIsCreditsOpen,
  loading
}: ProfileModalProps) {
  const { theme, setTheme } = useTheme();
  const [selectedTiming, setSelectedTiming] = React.useState<string>('10m');

  React.useEffect(() => {
    if (user?.notification_timing) {
      setSelectedTiming(user.notification_timing);
    }
  }, [user]);

  if (!user) return null;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white dark:bg-zinc-900 bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-all duration-500">
        <div className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #EA4335, #FBBC05, #34A853, #4285F4)' }}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name[0]
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#222222] dark:text-zinc-100">{user.name}</DialogTitle>
              <p className="text-sm text-gray-400 dark:text-zinc-500">{user.email}</p>
            </div>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* 基本設定 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">表示名</label>
                <input name="name" type="text" defaultValue={user.name} className="w-full h-12 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-[#222222] dark:text-zinc-100" required />
              </div>
            </div>

            {/* テーマ設定 */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-sm font-black text-[#222222] dark:text-zinc-100 uppercase tracking-wider">表示設定</h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em]">表示モード</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-[0.97] cursor-pointer ${
                        theme === t
                          ? 'border-[#6366f1] bg-indigo-50/20 dark:bg-indigo-950/20 text-[#6366f1]'
                          : 'border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 text-gray-500 dark:text-zinc-400 hover:border-gray-250 dark:hover:border-zinc-700'
                      }`}
                    >
                      {t === 'light' && <Sun className="w-4 h-4" />}
                      {t === 'dark' && <Moon className="w-4 h-4" />}
                      {t === 'system' && <Laptop className="w-4 h-4" />}
                      <span className="text-[10px] font-black">
                        {t === 'light' ? 'ライト' : t === 'dark' ? 'ダーク' : '自動'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 通知設定セクション */}
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-sm font-black text-[#222222] dark:text-zinc-100 uppercase tracking-wider">通知設定</h3>
              </div>

              <div className="space-y-3">
                {/* メール通知 */}
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm">
                      <Mail className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#222222] dark:text-zinc-100">メール通知</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-550 font-medium">イベントのリマインドを受信</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    name="email_enabled" 
                    defaultChecked={user.email_enabled} 
                    className="w-5 h-5 accent-[#6366f1] rounded-md"
                  />
                </label>

                {/* プッシュ通知は内部機能として残すがUIからは削除 */}
              </div>

              {/* リリース当初はタイミング選択を非表示（10分前固定） */}
            </div>

            <button type="submit" disabled={loading} className="w-full h-12 bg-[#222222] hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? '保存中...' : '設定を保存'}
            </button>
          </form>

          <div className="pt-2 space-y-2">
            {/* Note Manual Link */}
            <a
              href="https://note.com/preview/nad616c182cc9?prev_access_key=c61dfc6145574f6322c6e7b0b9f66305"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-[#6366f1]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-[#222222] dark:text-zinc-100">使い方マニュアル</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-550 font-medium">noteでマニュアルを読む（外部サイト）</p>
                </div>
              </div>
            </a>

            <button
              type="button"
              onClick={() => {
                onOpenChange(false); // プロフィールを閉じてからクレジットを開く
                setIsCreditsOpen(true);
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm">
                  <Info className="w-5 h-5 text-gray-400 group-hover:text-[#6366f1]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-[#222222] dark:text-zinc-100">クレジットと法務情報</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-550 font-medium">運営・利用規約・プライバシーポリシー</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 text-sm font-bold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
            >
              ログアウト
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
