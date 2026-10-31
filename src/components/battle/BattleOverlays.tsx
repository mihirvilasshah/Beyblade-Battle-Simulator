import type { BattleEventType } from "@/types/battle";
import type { Beyblade } from "@/types/beyblade";
import type { SoundName } from "@/lib/sound";
import { BeyImage } from "@/components/beyblade/BeyImage";
import { TypeBadge } from "@/components/ui/Badges";

export interface CalloutConfig {
  emoji: string;
  text: string;
  color: string;
  sound?: SoundName;
}

export const CALLOUTS: Partial<Record<BattleEventType, CalloutConfig>> = {
  FIRST_CONTACT: { emoji: "⚡", text: "First Contact!", color: "#fde68a", sound: "collision" },
  DIRECT_HIT: { emoji: "⚡", text: "Direct Hit!", color: "#fde047", sound: "collision" },
  XTREME_DASH: { emoji: "⚡", text: "Xtreme Dash!", color: "#38d3f5", sound: "dash" },
  HEAVY_IMPACT: { emoji: "💥", text: "Massive Impact!", color: "#ff8a3d", sound: "heavy" },
  COUNTER: { emoji: "🔄", text: "Counter Attack!", color: "#c084fc", sound: "collision" },
  BURST_FINISH: { emoji: "💥", text: "Burst Finish!", color: "#ff4d6d", sound: "burst" },
  KNOCKOUT_FINISH: { emoji: "🚀", text: "Knockout Finish!", color: "#38d3f5", sound: "knockout" },
  XTREME_FINISH: { emoji: "✖", text: "Xtreme Finish!", color: "#ff7a2f", sound: "knockout" },
  SURVIVOR_FINISH: { emoji: "🌀", text: "Survivor Finish!", color: "#3ddc84" },
};

export function Callout({ config, big }: { config: CalloutConfig; big?: boolean }) {
  return (
    <div
      className="anim-persist pointer-events-none absolute left-1/2 top-[14%] z-20 whitespace-nowrap font-display font-bold uppercase italic tracking-[0.12em]"
      style={{
        animation: `callout-in ${big ? 1.8 : 1.2}s cubic-bezier(0.2,0.8,0.2,1) both`,
        transform: "translateX(-50%) skewX(-8deg)",
        color: config.color,
        fontSize: big ? "clamp(1.4rem, 5.5vw, 2.8rem)" : "clamp(1.05rem, 4vw, 1.9rem)",
        textShadow: `0 0 24px ${config.color}, 0 2px 0 rgba(0,0,0,0.6)`,
      }}
    >
      <span aria-hidden>{config.emoji} </span>
      {config.text}
    </div>
  );
}

export function CountdownOverlay({ step }: { step: string }) {
  const go = step.startsWith("GO");
  return (
    <div className="pointer-events-none absolute inset-[4%] z-20 grid place-items-center rounded-full bg-black/35 backdrop-blur-[2px]">
      <p
        key={step}
        className="anim-persist font-display font-bold italic tracking-[0.08em] text-white"
        style={{
          animation: "countdown-pop 0.7s cubic-bezier(0.2,0.8,0.2,1) both",
          fontSize: go ? "clamp(2rem, 9vw, 5rem)" : step === "READY" ? "clamp(2rem, 8vw, 4.2rem)" : "clamp(4rem, 18vw, 9rem)",
          textShadow: go ? "0 0 40px #ff7a2f, 0 0 80px #ff2e63" : "0 0 40px var(--accent)",
        }}
      >
        {step}
      </p>
    </div>
  );
}

export function RandomReveal({ beys }: { beys: [Beyblade, Beyblade] }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_center,rgba(8,12,20,0.75),rgba(3,4,6,0.95))] backdrop-blur-sm">
      <div className="w-full px-4 text-center">
        <p className="eyebrow animate-rise-in">Today&apos;s challenge</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:gap-5">
          {beys.map((bey, i) => (
            <div key={i} className="contents">
              {i === 1 && (
                <p className="font-display text-3xl font-bold italic text-white/90 sm:text-5xl" style={{ animation: "vs-slam 0.5s 0.5s cubic-bezier(0.2,0.8,0.2,1) both" }}>
                  VS
                </p>
              )}
              <div className="flex items-center gap-3" style={{ animation: `${i === 0 ? "reveal-left" : "reveal-right"} 0.6s ${i === 0 ? 0.1 : 0.8}s cubic-bezier(0.2,0.8,0.2,1) both` }}>
                <BeyImage visual={bey.visual} type={bey.type} spin={bey.spinDirection} ratchet={bey.resolvedParts.ratchet.name} motion="float" className="size-16 sm:size-24" />
                <div className="text-left">
                  <p className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white sm:text-3xl">
                    <span aria-hidden>{i === 0 ? "⚡ " : "🔥 "}</span>
                    {bey.name}
                  </p>
                  <TypeBadge type={bey.type} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WinnerBanner({ name, finish, color }: { name: string; finish: string; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.55),rgba(0,0,0,0.2)_70%)]">
      <div className="text-center" style={{ animation: "rise-in 0.6s cubic-bezier(0.2,0.8,0.2,1) both" }}>
        <p className="font-display text-xs font-bold tracking-[0.5em] text-white/80 sm:text-sm">WINNER</p>
        <p
          className="mt-1 font-display font-bold uppercase italic leading-none tracking-[0.06em] text-white"
          style={{ fontSize: "clamp(1.6rem, 7vw, 3.6rem)", textShadow: `0 0 30px ${color}, 0 0 60px ${color}` }}
        >
          <span aria-hidden>🔥 </span>
          {name}
          <span aria-hidden> 🔥</span>
        </p>
        <p className="mt-2 font-display text-lg font-bold tracking-[0.4em] text-white sm:text-2xl">VICTORY</p>
        <p className="mt-1 font-display text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm" style={{ color }}>
          {finish}
        </p>
      </div>
    </div>
  );
}
