'use client';
import { useState } from 'react';
import { Calendar, CheckCircle, AlertTriangle, Users, Hexagon, Star, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Mocks
const MOCK_GROUPS = [
  { id: '1', name: 'Virtual Idols A', initial: 'VA', color: 'bg-primary' },
  { id: '2', name: 'Singer Songwriter B', initial: 'SB', color: 'bg-purple-500' },
  { id: '3', name: 'Indie Band C', initial: 'IC', color: 'bg-blue-500' },
];

const MOCK_EVENTS = [
  { id: '1', title: 'Live Concert 2026', date: '2026-05-10', location: 'Tokyo Dome', image: 'https://images.unsplash.com/photo-1540039155732-d67414bc5c4a?w=800&q=80', verified: true },
  { id: '2', title: 'Fan Meetup Online', date: '2026-05-15', location: 'Discord', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80', verified: false, disputed: true },
  { id: '3', title: 'New Single Release', date: '2026-06-01', location: 'Spotify/Apple Music', image: 'https://images.unsplash.com/photo-1614613535308-ea5fbfd5c36c?w=800&q=80', verified: true },
];

export default function App() {
  const [activeGroupId, setActiveGroupId] = useState('1');

  return (
    <div className="flex h-screen w-full bg-[#f2f2f2]">
      {/* Discord-style Sidebar */}
      <div className="w-[72px] bg-[#222222] h-full flex flex-col items-center py-4 gap-4 flex-shrink-0">
        {MOCK_GROUPS.map((g) => (
          <button 
            key={g.id} 
            onClick={() => setActiveGroupId(g.id)}
            className={`w-12 h-12 rounded-[50%] transition-all duration-200 flex items-center justify-center text-white font-bold text-lg hover:rounded-[16px] \${activeGroupId === g.id ? 'rounded-[16px] ' + g.color : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {g.initial}
          </button>
        ))}
        <div className="w-8 h-[2px] bg-gray-700 rounded my-2" />
        <button className="w-12 h-12 rounded-[50%] bg-gray-700 hover:bg-gray-600 transition-all duration-200 flex items-center justify-center text-green-400 hover:rounded-[16px]">
          <Plus size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white rounded-l-[32px] overflow-hidden shadow-2xl relative">
        <header className="h-20 border-b flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#222222]">Oshi-Link Calendar</h1>
            <p className="text-sm font-medium text-gray-500">ファン参加型カレンダー</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="rounded-full shadow-sm hover-shadow bg-white text-[#222222] border-gray-200 h-10 px-6 font-medium">
              Subscribe Premium (¥500/mo)
            </Button>
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#ffffff]">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
              <h2 className="text-[28px] font-bold tracking-tight text-[#222222]">Upcoming Events</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-[#ff385c] hover:bg-[#e00b41] text-white rounded-lg h-12 px-6 font-semibold shadow-md">
                    <Plus className="mr-2 h-5 w-5" /> Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>予定を追加</DialogTitle>
                    <DialogDescription>
                      ファンコミュニティに推しの予定を共有しましょう。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <input className="w-full h-12 border border-gray-200 rounded-lg px-4 focus:ring-2 focus:ring-[#ff385c] outline-none" placeholder="イベントタイトル" />
                    <input type="date" className="w-full h-12 border border-gray-200 rounded-lg px-4 focus:ring-2 focus:ring-[#ff385c] outline-none" />
                    <input className="w-full h-12 border border-gray-200 rounded-lg px-4 focus:ring-2 focus:ring-[#ff385c] outline-none" placeholder="ソースURL" />
                    <Button className="w-full bg-[#222222] text-white h-12 rounded-lg">Submit for Verification</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Airbnb Style Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_EVENTS.map((event) => (
                <div key={event.id} className="card-shadow rounded-[20px] overflow-hidden group cursor-pointer flex flex-col bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <button className="absolute top-4 right-4 text-white hover:text-[#ff385c] transition-colors">
                      <Star className="h-6 w-6 drop-shadow-md" />
                    </button>
                    {/* Community Notes Style Badge Floating */}
                    <div className="absolute bottom-4 left-4">
                      {event.verified ? (
                        <Badge className="bg-white/90 text-green-700 backdrop-blur-sm px-3 py-1 text-xs shadow-sm flex items-center border-none">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Source
                        </Badge>
                      ) : event.disputed ? (
                        <Badge className="bg-white/90 text-[#c13515] backdrop-blur-sm px-3 py-1 text-xs shadow-sm flex items-center border-none">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Needs Verification
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-[18px] text-[#222222] leading-tight">{event.title}</h3>
                    </div>
                    <p className="text-[#6a6a6a] text-[14px] mt-1">{event.location}</p>
                    <p className="text-[#222222] font-medium text-[15px] mt-2">{new Date(event.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}</p>

                    {/* Community Note Box */}
                    {!event.verified && event.disputed && (
                      <div className="mt-4 bg-[#f2f2f2] rounded-xl p-3 border border-gray-100 relative">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-[12px] text-[#6a6a6a] leading-relaxed">
                            <span className="font-semibold text-[#222222]">Community Note:</span> このイベントの日程については公式発表と異なる可能性があります。
                            <a href="#" className="text-blue-500 hover:underline block mt-1">検証に参加する →</a>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
