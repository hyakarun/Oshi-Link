import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { User, Group } from '@/lib/types';
import { Bell, Mail, Info, Sun, Moon, Laptop, Palette, BookOpen, ShieldCheck } from 'lucide-react';
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
  const [activeTab, setActiveTab] = React.useState<'settings' | 'others'>('settings');

  React.useEffect(() => {
    if (user?.notification_timing) {
      setSelectedTiming(user.notification_timing);
    }
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 transition-all duration-500">
        <div className="p-8 space-y-6 h-[580px] flex flex-col bg-popover text-popover-foreground">
          <div className="flex items-center gap-4 shrink-0">
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
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-black text-foreground">{user.name}</DialogTitle>
                {(user.is_official || (user.official_groups && user.official_groups.length > 0)) && (
                  <ShieldCheck className="w-5 h-5 text-[#6366f1] fill-indigo-100 dark:fill-indigo-950/40 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.is_official && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#6366f1] dark:text-indigo-400 rounded-md text-[8px] font-black tracking-widest uppercase">
                    システム公式
                  </span>
                )}
                {!user.is_official && user.official_groups && user.official_groups.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#6366f1] dark:text-indigo-400 rounded-md text-[8px] font-black tracking-widest uppercase">
                    カレンダー公式
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-border shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 pb-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 ${
                activeTab === 'settings'
                  ? 'text-[#6366f1] border-[#6366f1]'
                  : 'text-gray-400 dark:text-zinc-500 border-transparent hover:text-gray-600 dark:hover:text-zinc-300'
              }`}
            >
              アカウント設定
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('others')}
              className={`flex-1 pb-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 ${
                activeTab === 'others'
                  ? 'text-[#6366f1] border-[#6366f1]'
                  : 'text-gray-400 dark:text-zinc-500 border-transparent hover:text-gray-600 dark:hover:text-zinc-300'
              }`}
            >
              その他
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'settings' ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* 基本設定 */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em]">表示名</label>
                    <input name="name" type="text" defaultValue={user.name} className="w-full h-12 bg-muted border border-border rounded-xl px-4 focus:ring-2 focus:ring-[#6366f1] outline-none font-bold text-foreground" required />
                  </div>

                  {/* 管理中の公式カレンダー */}
                  {user.official_groups && user.official_groups.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em]">管理中の公式カレンダー</label>
                      <div className="space-y-1.5">
                        {user.official_groups.map(groupId => {
                          const group = followedGroups.find(g => g.id === groupId);
                          return (
                            <div key={groupId} className="flex items-center gap-2.5 p-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-950/20 rounded-2xl">
                              <div className="w-6 h-6 rounded-lg bg-[#6366f1] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                {group?.name?.[0] || 'G'}
                              </div>
                              <span className="text-xs font-bold text-foreground truncate">
                                {group?.name || `グループID: ${groupId}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* テーマ設定 */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Palette className="w-4 h-4 text-[#6366f1]" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">表示設定</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em]">表示モード</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-[0.97] cursor-pointer ${
                            theme === t
                              ? 'border-[#6366f1] bg-indigo-50/20 dark:bg-indigo-950/20 text-[#6366f1]'
                              : 'border-border bg-muted text-muted-foreground hover:border-muted-foreground/60 hover:bg-accent'
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
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-[#6366f1]" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">通知設定</h3>
                  </div>

                  <div className="space-y-3">
                    {/* メール通知 */}
                    <label className="flex items-center justify-between p-4 bg-muted rounded-2xl cursor-pointer hover:bg-accent transition-colors border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card rounded-lg shadow-sm border border-border/50">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">メール通知</p>
                          <p className="text-[10px] text-muted-foreground font-medium">イベントのリマインドを受信</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        name="email_enabled" 
                        defaultChecked={user.email_enabled} 
                        className="w-5 h-5 accent-[#6366f1] rounded-md"
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full h-12 bg-[#222222] hover:bg-black dark:bg-primary dark:hover:bg-primary/90 text-white font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
                  {loading ? '保存中...' : '設定を保存'}
                </button>
              </form>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Note Manual Link */}
                <a
                  href="https://note.com/tsukuro_team/n/nad616c182cc9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-accent transition-all group cursor-pointer border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border/50">
                      <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-[#6366f1]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-foreground">使い方マニュアル</p>
                      <p className="text-[10px] text-muted-foreground font-medium">noteでマニュアルを読む（外部サイト）</p>
                    </div>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    setIsCreditsOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-accent transition-all group cursor-pointer border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border/50">
                      <Info className="w-5 h-5 text-muted-foreground group-hover:text-[#6366f1]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-foreground">クレジットと法務情報</p>
                      <p className="text-[10px] text-muted-foreground font-medium">運営・利用規約・プライバシーポリシー</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 text-sm font-black text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-950/30"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
