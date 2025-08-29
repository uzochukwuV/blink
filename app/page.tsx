"use client";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { PillButton } from "~/components/ui/PillButton";
import Link from "next/link";
// removed mock imports
import { useState, useEffect } from "react";
import { Channel } from "~/lib/types";

export default function HomePage() {
  const [hotChannels, setHotChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotChannels = async () => {
      try {
        const response = await fetch('/api/markets/channels');
        const data = await response.json();
        setHotChannels(data.data.slice(0, 2));
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotChannels();
  }, []);

  return (
    <MobileShell activeTab="home" topBar={<TopBar title="Blink" />}>
      <div className="p-4 pb-24 min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Welcome Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 transform hover:scale-105 transition-all duration-300">
            <span className="text-white text-3xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">Welcome to Blink</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto">
            Bet on creators, channels, and viral moments in the Farcaster ecosystem.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link href="/markets">
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:shadow-primary/5 text-center hover:bg-accent/50 transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">📈</div>
              <div className="font-semibold text-card-foreground mb-1">Creator Bets</div>
              <div className="text-muted-foreground text-sm">Bet on influencers</div>
            </div>
          </Link>
          <Link href="/markets/farcaster">
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:shadow-primary/5 text-center hover:bg-accent/50 transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🏆</div>
              <div className="font-semibold text-card-foreground mb-1">Channel Wars</div>
              <div className="text-muted-foreground text-sm">Growth battles</div>
            </div>
          </Link>
          <Link href="/bets">
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:shadow-primary/5 text-center hover:bg-accent/50 transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">💰</div>
              <div className="font-semibold text-card-foreground mb-1">My Bets</div>
              <div className="text-muted-foreground text-sm">Track winnings</div>
            </div>
          </Link>
          <Link href="/bets/polls">
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:shadow-primary/5 text-center hover:bg-accent/50 transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">📊</div>
              <div className="font-semibold text-card-foreground mb-1">Poll Bets</div>
              <div className="text-muted-foreground text-sm">Prediction markets</div>
            </div>
          </Link>
        </div>

        {/* Hot Markets */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl animate-pulse">🔥</div>
            <h2 className="text-xl font-bold text-foreground">Hot Markets</h2>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="bg-card rounded-xl p-4 border border-border shadow-sm animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded-lg w-28 mb-2"></div>
                      <div className="h-3 bg-muted rounded-lg w-20"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border shadow-sm animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded-lg w-28 mb-2"></div>
                      <div className="h-3 bg-muted rounded-lg w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              hotChannels.map((channel, i) => (
                <div key={channel.id} className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {channel.imageUrl ? (
                        <img 
                          src={channel.imageUrl} 
                          alt={channel.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                          {channel.avatarInitials}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-card-foreground text-sm group-hover:text-primary transition-colors duration-300">{channel.name}</div>
                        <div className="text-muted-foreground text-xs">{channel.followers.toLocaleString()} followers</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm px-2 py-1 rounded-lg shadow-sm">+{channel.growth}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <Link href="/markets">
          <PillButton className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-[1.02] transition-all duration-300 text-lg font-semibold py-4">
            🚀 Start Betting
          </PillButton>
        </Link>
      </div>
    </MobileShell>
  );
}