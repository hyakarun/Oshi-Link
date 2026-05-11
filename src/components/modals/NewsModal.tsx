import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ExternalLink, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

interface NewsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewsModal({ isOpen, onOpenChange }: NewsModalProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNews();
    }
  }, [isOpen]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json() as { items: any[] };
        setNews(data.items);
        
        // 最後に見た日付を保存（通知バッジ消去用）
        if (data.items.length > 0) {
          localStorage.setItem('oshi_news_last_seen', data.items[0].pubDate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-white bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#6366f1] rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#222222]">運営からのお知らせ</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                最新のアップデートや情報を確認できます
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading news...</p>
              </div>
            ) : news.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-sm font-bold">現在お知らせはありません</p>
              </div>
            ) : (
              news.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {item.pubDate ? format(new Date(item.pubDate), 'yyyy.MM.dd', { locale: ja }) : ''}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#6366f1] transition-colors" />
                  </div>
                  <h3 className="text-sm font-black text-[#222222] leading-snug group-hover:text-[#6366f1] transition-colors">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-[11px] text-gray-400 font-medium mt-2 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                </a>
              ))
            )}
          </div>

          <div className="pt-2">
            <a
              href="https://note.com/tsukuro_team/m/m264f34cbee5f" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-12 rounded-xl bg-gray-900 text-white font-black text-sm hover:bg-black transition-all"
            >
              noteで全て見る
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
