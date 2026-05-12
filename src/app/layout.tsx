import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: {
    default: 'Oshi-Link | 推しの予定をみんなで共有・管理するカレンダー',
    template: '%s | Oshi-Link'
  },
  description: '推しのスケジュールを一つの場所に。Oshi-Linkはファンが共同で編集・管理するカレンダープラットフォームです。ライブ、配信、リリース情報を逃さずチェック。',
  keywords: ['推し活', 'カレンダー', 'スケジュール', '共同編集', 'ファンコミュニティ', 'Oshi-Link', 'オシリンク'],
  authors: [{ name: 'TSUKURO!' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  openGraph: {
    title: 'Oshi-Link | 推しの予定をみんなで共有・管理するカレンダー',
    description: '推しのスケジュールを一つの場所に。ファンが共同で編集・管理するカレンダープラットフォーム。',
    url: 'https://oshi-link.com',
    siteName: 'Oshi-Link',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oshi-Link | 推しの予定をみんなで共有・管理するカレンダー',
    description: '推しのスケジュールを一つの場所に。ファンが共同で編集・管理するカレンダープラットフォーム。',
    creator: '@TSUKUROofficial',
  },
  alternates: {
    canonical: 'https://oshi-link.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Oshi-Link',
              url: 'https://oshi-link.com',
              description: '推しのスケジュールをみんなで共有・管理するカレンダープラットフォーム。',
              applicationCategory: 'CalendarApplication',
              operatingSystem: 'Any',
              author: {
                '@type': 'Organization',
                name: 'TSUKURO!'
              }
            })
          }}
        />
      </body>
    </html>
  );
}
