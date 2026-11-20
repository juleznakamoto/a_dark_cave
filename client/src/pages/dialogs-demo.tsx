import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import AuthDialog from "@/components/game/AuthDialog";
import BlessingOfferDialog from "@/components/game/BlessingOfferDialog";
import CombatDialog from "@/components/game/CombatDialog";
import { DeleteAccountDialog } from "@/components/game/DeleteAccountDialog";
import DemoTimeUpDialog from "@/components/game/DemoTimeUpDialog";
import EmailConfirmedDialog from "@/components/game/EmailConfirmedDialog";
import EventDialog from "@/components/game/EventDialog";
import FeedbackDialog from "@/components/game/FeedbackDialog";
import GamblerDiceDialog from "@/components/game/GamblerDiceDialog";
import IdleModeDialog from "@/components/game/IdleModeDialog";
import InactivityDialog from "@/components/game/InactivityDialog";
import InsightIntroDialog from "@/components/game/InsightIntroDialog";
import InsightPotionDialog from "@/components/game/InsightPotionDialog";
import InvestDialog from "@/components/game/InvestDialog";
import InvestmentResultDialog from "@/components/game/InvestmentResultDialog";
import LeaderboardDialog from "@/components/game/LeaderboardDialog";
import MadnessDialog from "@/components/game/MadnessDialog";
import PactOfferDialog from "@/components/game/PactOfferDialog";
import { RestartGameDialog } from "@/components/game/RestartGameDialog";
import RewardDialog from "@/components/game/RewardDialog";
import SettingsDialog from "@/components/game/SettingsDialog";
import ShareDialog from "@/components/game/ShareDialog";
import { ShopDialog } from "@/components/game/ShopDialog";
import SocialPromptDialog from "@/components/game/SocialPromptDialog";
import StayConnectedDialog from "@/components/game/StayConnectedDialog";
import SteamDemoContinueDialog from "@/components/game/SteamDemoContinueDialog";
import VillageEffectDialog from "@/components/game/VillageEffectDialog";
import { Button } from "@/components/ui/button";
import { buildDevSave } from "@/game/devSaves";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { WATCHING_CHILDREN_GOLD } from "@/game/rules/eventsMadness";
import { buildEventDialogLogEntry, gameEvents } from "@/game/rules/events";
import { getTotalLuck } from "@/game/rules/effectsCalculation";
import { FINANCE_EXPEDITION_TIERS } from "@/game/rules/financeExpedition";
import {
  lossGold,
  successProfitGold,
} from "@/game/rules/investmentHallTables";
import type { GameStore } from "@/game/store/types";
import { StateManager, useGameStore } from "@/game/state";
import { stopGameLoop } from "@/game/loop";
import type { CombatResultSummary, Enemy } from "@/game/types";
import type { LogEntry } from "@/game/rules/events";
import type { GameState } from "@shared/schema";
import { logger } from "@/lib/logger";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";

type CombatOpen = {
  enemy: Enemy;
  eventTitle: string;
  eventMessage: string;
  onVictory: () => CombatResultSummary;
  onDefeat: () => CombatResultSummary;
};

type Section = {
  title: string;
  specimens: { id: string; label: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Story",
    specimens: [
      { id: "story-pale", label: "The Slender Figure" },
      { id: "story-ring", label: "Ring of the Drowned" },
    ],
  },
  {
    title: "Madness",
    specimens: [
      { id: "madness-warning", label: "Whispers of Madness" },
      { id: "madness-children", label: "Staring Children" },
      { id: "madness-voices", label: "Whispering Voices" },
    ],
  },
  {
    title: "Cube memory",
    specimens: [
      { id: "cube-awake", label: "The Cube Awakens" },
      { id: "cube-guardians", label: "The Guardians" },
    ],
  },
  {
    title: "Combat",
    specimens: [
      { id: "combat-first", label: "The First Wave" },
      { id: "combat-boss", label: "Boss Wave" },
    ],
  },
  {
    title: "Reward",
    specimens: [
      { id: "reward-purse", label: "Staring Children, gold" },
      { id: "reward-ring", label: "Ring of the Drowned" },
    ],
  },
  {
    title: "Madness result",
    specimens: [
      { id: "madness-result-listen", label: "Whispering Voices, listen" },
      { id: "madness-result-ignore", label: "Whispering Voices, ignore" },
    ],
  },
  {
    title: "Insight",
    specimens: [
      { id: "insight-intro", label: "Insight introduced" },
      { id: "insight-potion", label: "Finance Expedition" },
    ],
  },
  {
    title: "Village effect",
    specimens: [
      { id: "village-feast", label: "Village Feast" },
      { id: "village-curse", label: "Witch's Curse" },
    ],
  },
  {
    title: "Investment result",
    specimens: [
      { id: "invest-result-win", label: "Coinhouse, paid out" },
      { id: "invest-result-loss", label: "Coinhouse, partial loss" },
    ],
  },
  {
    title: "Pacts",
    specimens: [
      { id: "pact-one", label: "One pact" },
      { id: "pact-two", label: "Two pacts" },
    ],
  },
  {
    title: "Blessings",
    specimens: [
      { id: "blessing-early", label: "First three blessings" },
      { id: "blessing-late", label: "Last three blessings" },
    ],
  },
  {
    title: "Gambler",
    specimens: [
      { id: "gambler-tutorial", label: "Practice round" },
      { id: "gambler-wager", label: "Gold wager" },
    ],
  },
  {
    title: "Sleep",
    specimens: [
      { id: "sleep-short", label: "2 hour sleep" },
      { id: "sleep-long", label: "18 hour sleep" },
    ],
  },
  {
    title: "Shop",
    specimens: [
      { id: "shop-all", label: "All goods" },
      { id: "shop-gold", label: "Gold" },
    ],
  },
  {
    title: "Invest",
    specimens: [
      { id: "invest-small", label: "100 gold" },
      { id: "invest-large", label: "2,500 gold" },
    ],
  },
  {
    title: "Account",
    specimens: [
      { id: "auth-signin", label: "Sign in" },
      { id: "auth-signup", label: "Create account" },
      { id: "email-confirmed", label: "Email confirmed" },
    ],
  },
  {
    title: "Settings",
    specimens: [
      { id: "settings-normal", label: "Normal" },
      { id: "settings-ios", label: "iOS" },
    ],
  },
  {
    title: "New game",
    specimens: [
      { id: "restart-plain", label: "Start over" },
      { id: "restart-cruel", label: "Cruel Mode offered" },
      { id: "delete-account", label: "Delete account" },
    ],
  },
  {
    title: "Away",
    specimens: [
      { id: "away-timeout", label: "You were away" },
      { id: "away-tab", label: "Open in another tab" },
    ],
  },
  {
    title: "Social",
    specimens: [
      { id: "social-prompt", label: "Rewards" },
      { id: "share-card", label: "Progress card" },
    ],
  },
  {
    title: "Ranks",
    specimens: [
      { id: "ranks-blank", label: "No name yet" },
      { id: "ranks-named", label: "Name set" },
    ],
  },
  {
    title: "Contact",
    specimens: [
      { id: "feedback", label: "Feedback" },
      { id: "stay-connected", label: "Stay connected" },
    ],
  },
  {
    title: "Demo end",
    specimens: [
      { id: "demo-time", label: "Time is up" },
      { id: "demo-continue", label: "Continue demo" },
    ],
  },
];

const EVENT_IDS: Record<string, string> = {
  "story-pale": "paleFigure",
  "story-ring": "ringOfDrownedChoice",
  "madness-warning": "madnessWarning",
  "madness-children": "watchingChildren",
  "madness-voices": "whisperingVoices",
  "cube-awake": "cube01",
  "cube-guardians": "cubeLostCivilization",
};

function eventText(id: string, key: string): string {
  return i18n.t(`events:${id}.${key}`, { defaultValue: "" });
}

function seedBastion() {
  const built = buildDevSave("bastion");
  useGameStore.setState({
    ...built,
    isPaused: true,
    activeDevSaveId: "bastion",
    devGameMode: "normal",
  } as unknown as Partial<GameStore>);
  StateManager.scheduleEffectsUpdate(useGameStore.getState);
}

function liveState(): GameState {
  return useGameStore.getState() as unknown as GameState;
}

function openCombatWave(waveId: "firstWave" | "firstBossWave"): CombatOpen | null {
  const event = gameEvents[waveId];
  const result = event?.effect?.(liveState()) as { _combatData?: CombatOpen } | undefined;
  const data = result?._combatData;
  if (!data?.enemy) {
    logger.warn(`[dialogs-demo] ${waveId} did not return a fight`);
    return null;
  }
  return data;
}

export default function DialogsDemo() {
  const [ready, setReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [eventEntry, setEventEntry] = useState<LogEntry | null>(null);
  const [combat, setCombat] = useState<CombatOpen | null>(null);
  const socialStoreOpen = useGameStore((s) => s.socialPromptDialogOpen);
  const inactivityReason = useGameStore((s) => s.inactivityReason);
  const playerGold = useGameStore((s) => s.resources.gold ?? 0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const previous = useGameStore.getState();
    mountNotoSansSymbols2FontFace();
    seedBastion();
    let cancelled = false;
    void ensureGameplayLocalesLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      useGameStore.setState(previous);
    };
  }, []);

  useEffect(() => {
    if (openId === "social-prompt" && !socialStoreOpen) setOpenId(null);
  }, [openId, socialStoreOpen]);

  // Continue on the away dialog clears the reason and starts the game loop,
  // but this page keeps the dialog mounted. It has no close mark, so the
  // shell stays empty and the sim can open another dialog on top.
  useEffect(() => {
    if (
      (openId === "away-timeout" || openId === "away-tab") &&
      inactivityReason == null
    ) {
      stopGameLoop();
      seedBastion();
      setOpenId(null);
    }
  }, [openId, inactivityReason]);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const close = () => {
    setOpenId(null);
    const eventDialog = useGameStore.getState().eventDialog;
    if (eventDialog?.isOpen) {
      useGameStore.setState({
        eventDialog: { ...eventDialog, isOpen: false, currentEvent: null },
      });
    }
  };

  const open = (id: string) => {
    if (openId === id) {
      seedBastion();
      setOpenId(null);
      return;
    }
    seedBastion();
    const state = useGameStore.getState();

    const eventId = EVENT_IDS[id];
    if (eventId) {
      const rules = gameEvents[eventId];
      if (!rules) return;
      const entry = buildEventDialogLogEntry(rules, liveState());
      const eventDialog = useGameStore.getState().eventDialog;
      // The gallery stays paused. Choice buttons only dismiss a story
      // dialog when the store says that dialog is the one on screen.
      useGameStore.setState({
        eventDialog: {
          ...eventDialog,
          isOpen: true,
          currentEvent: entry,
        },
      });
      setEventEntry(entry);
      setOpenId(id);
      return;
    }

    if (id === "combat-first" || id === "combat-boss") {
      const wave = openCombatWave(id === "combat-first" ? "firstWave" : "firstBossWave");
      if (!wave) return;
      setCombat(wave);
      setOpenId(id);
      return;
    }

    if (id === "reward-purse") {
      setOpenId(id);
      return;
    }
    if (id === "reward-ring") {
      setOpenId(id);
      return;
    }
    if (id === "madness-result-listen" || id === "madness-result-ignore") {
      setOpenId(id);
      return;
    }
    if (id === "insight-intro" || id === "insight-potion") {
      setOpenId(id);
      return;
    }
    if (id === "village-feast" || id === "village-curse") {
      setOpenId(id);
      return;
    }
    if (id === "invest-result-win" || id === "invest-result-loss") {
      setOpenId(id);
      return;
    }

    if (id === "pact-one" || id === "pact-two") {
      useGameStore.setState({
        pactChoices: id === "pact-one" ? 1 : 2,
        chosenPacts: [],
        pactOfferPending: true,
        pactOfferDialogOpen: true,
        cruelMode: false,
        devGameMode: "normal",
      });
      setOpenId(id);
      return;
    }

    if (id === "blessing-early" || id === "blessing-late") {
      const late = id === "blessing-late";
      useGameStore.setState({
        resources: {
          ...state.resources,
          insight: late ? 2500 : 800,
        },
        blessings: {
          ...state.blessings,
          trail_sense: late,
          skilled_hands: late,
          keen_builder: late,
        },
        insightBlessingOfferState: late
          ? {
              slots: ["fresh_blood", "depths_gift", "rich_veins"],
              nextIndex: 6,
            }
          : {
              slots: ["trail_sense", "skilled_hands", "keen_builder"],
              nextIndex: 3,
            },
        blessingOfferDialogOpen: true,
      });
      setOpenId(id);
      return;
    }

    if (id === "gambler-tutorial" || id === "gambler-wager") {
      const tutorial = id === "gambler-tutorial";
      useGameStore.setState({
        lifetimeGamesWon: tutorial ? 0 : 1,
        resources: { ...state.resources, gold: tutorial ? 40 : 400 },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            gamblerTutorialPlaysRemaining: tutorial ? 2 : 0,
          },
        },
      });
      setOpenId(id);
      return;
    }

    if (id === "sleep-short" || id === "sleep-long") {
      useGameStore.setState({
        sleepUpgrades: {
          ...state.sleepUpgrades,
          lengthLevel: id === "sleep-short" ? 0 : 8,
        },
        idleModeState: { isActive: false, startTime: 0, needsDisplay: false },
        idleModeDialog: { isOpen: true },
      });
      setOpenId(id);
      return;
    }

    if (id === "shop-all" || id === "shop-gold") {
      useGameStore.setState({
        shopFilter: id === "shop-gold" ? "gold" : null,
        shopCheckoutItemId: null,
        cruelMode: false,
      });
      setOpenId(id);
      return;
    }

    if (id === "invest-small" || id === "invest-large") {
      useGameStore.setState({
        buildings: { ...state.buildings, coinhouse: Math.max(state.buildings.coinhouse ?? 0, 1) },
        investmentHallState: {
          offers: [
            { durationMin: 5, tier: "A" },
            { durationMin: 10, tier: "B" },
            { durationMin: 15, tier: "D" },
          ],
          active: null,
          nextWavePlayTime: 0,
        },
        resources: {
          ...state.resources,
          gold: id === "invest-small" ? 100 : 2500,
        },
      });
      setOpenId(id);
      return;
    }

    if (id === "auth-signin" || id === "auth-signup") {
      useGameStore.setState({
        signUpPromptEligibleForGold: id === "auth-signup",
      });
      setOpenId(id);
      return;
    }

    if (id === "settings-normal" || id === "settings-ios") {
      useGameStore.setState({
        devGameMode: id === "settings-ios" ? "ios" : "normal",
      });
      setOpenId(id);
      return;
    }

    if (id === "restart-plain" || id === "restart-cruel") {
      useGameStore.setState({
        hasWonNormalGame: id === "restart-cruel",
        restartGamePreferCruelMode: false,
        devGameMode: "normal",
      });
      setOpenId(id);
      return;
    }

    if (id === "away-timeout" || id === "away-tab") {
      useGameStore.setState({
        inactivityReason: id === "away-tab" ? "multitab" : "timeout",
        inactivityDialogOpen: true,
      });
      setOpenId(id);
      return;
    }

    if (id === "social-prompt") {
      useGameStore.setState({ socialPromptDialogOpen: true });
      setOpenId(id);
      return;
    }

    if (id === "share-card") {
      useGameStore.setState({
        devGameMode: "normal",
        shareDialogOpen: true,
        playTime: Math.max(state.playTime ?? 0, 3_600_000),
      });
      setOpenId(id);
      return;
    }

    if (id === "ranks-blank" || id === "ranks-named") {
      useGameStore.setState({
        username: id === "ranks-named" ? "Northwatch" : "",
      });
      setOpenId(id);
      return;
    }

    if (id === "feedback") {
      useGameStore.setState({ feedbackDialogOpen: true });
      setOpenId(id);
      return;
    }
    if (id === "stay-connected") {
      useGameStore.setState({ stayConnectedDialogOpen: true });
      setOpenId(id);
      return;
    }
    if (id === "demo-time") {
      useGameStore.setState({
        devGameMode: "steamDemo",
        galaxyTimeUpDialogOpen: true,
        demoEndDialogDismissed: false,
      });
      setOpenId(id);
      return;
    }

    setOpenId(id);
  };

  const eventOpen = eventEntry != null && EVENT_IDS[openId ?? ""] != null;
  const stake = 100;
  const expeditionInsight = FINANCE_EXPEDITION_TIERS[0]?.insight ?? 250;

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <p className="text-xs text-stone-500">
            <Link href="/dev" className="underline decoration-stone-600 underline-offset-2">
              Dev pages
            </Link>
          </p>
          <h1 className="text-lg font-semibold">Dialogs</h1>
          <p className="text-sm text-muted-foreground">
            Each button opens a real dialog from the game. Two examples for
            every kind. Buttons inside the dialog close it.
          </p>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-sm font-medium">{section.title}</h2>
            <div className="flex flex-wrap gap-2">
              {section.specimens.map((specimen) => (
                <Button
                  key={specimen.id}
                  type="button"
                  size="sm"
                  variant={openId === specimen.id ? "default" : "outline"}
                  aria-pressed={openId === specimen.id}
                  disabled={!ready}
                  onClick={() => open(specimen.id)}
                >
                  {specimen.label}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <EventDialog
        isOpen={eventOpen}
        event={eventOpen ? eventEntry : null}
        onClose={close}
      />
      <CombatDialog
        isOpen={openId === "combat-first" || openId === "combat-boss"}
        onClose={close}
        enemy={combat?.enemy ?? null}
        eventTitle={combat?.eventTitle ?? ""}
        eventMessage={combat?.eventMessage ?? ""}
        onVictory={() => combat?.onVictory() ?? {}}
        onDefeat={() => combat?.onDefeat() ?? {}}
      />
      <RewardDialog
        isOpen={openId === "reward-purse" || openId === "reward-ring"}
        onClose={close}
        data={
          openId === "reward-purse"
            ? {
                title: eventText("watchingChildren", "title"),
                successLog: eventText("watchingChildren", "log.outcome0"),
                rewards: { resources: { gold: WATCHING_CHILDREN_GOLD } },
              }
            : openId === "reward-ring"
              ? {
                  title: eventText("ringOfDrownedChoice", "title"),
                  successLog: eventText("ringOfDrownedChoice", "log.outcome0"),
                  rewards: { clothing: ["ring_of_drowned"] },
                }
              : null
        }
      />
      <MadnessDialog
        isOpen={
          openId === "madness-result-listen" || openId === "madness-result-ignore"
        }
        onClose={close}
        data={
          openId === "madness-result-listen"
            ? {
                title: eventText("whisperingVoices", "title"),
                successLog: eventText("whisperingVoices", "log.outcome0"),
                madnessChange: 1,
              }
            : openId === "madness-result-ignore"
              ? {
                  title: eventText("whisperingVoices", "title"),
                  successLog: eventText("whisperingVoices", "log.outcome1"),
                  madnessChange: 2,
                }
              : null
        }
      />
      <InsightIntroDialog isOpen={openId === "insight-intro"} onClose={close} />
      <InsightPotionDialog
        isOpen={openId === "insight-potion"}
        onClose={close}
        data={openId === "insight-potion" ? { insightGain: expeditionInsight } : null}
      />
      <VillageEffectDialog
        isOpen={openId === "village-feast" || openId === "village-curse"}
        onClose={close}
        data={
          openId === "village-feast"
            ? {
                themeId: "feast",
                title: eventText("feast", "title"),
                message: eventText("feast", "log.outcome1"),
              }
            : openId === "village-curse"
              ? {
                  themeId: "curse",
                  title: eventText("witchsCurse", "title"),
                  message: eventText("witchsCurse", "log.outcome3"),
                }
              : null
        }
      />
      <InvestmentResultDialog
        isOpen={openId === "invest-result-win" || openId === "invest-result-loss"}
        onClose={close}
        data={
          openId === "invest-result-win"
            ? {
                kind: "success",
                amountGold: stake,
                goldDelta: successProfitGold(stake, "A", 5),
              }
            : openId === "invest-result-loss"
              ? {
                  kind: "partial_loss",
                  amountGold: stake,
                  goldDelta: -lossGold(stake, "A"),
                }
              : null
        }
      />
      <PactOfferDialog />
      <BlessingOfferDialog />
      <GamblerDiceDialog
        isOpen={openId === "gambler-tutorial" || openId === "gambler-wager"}
        playerGold={playerGold}
        playerLuck={getTotalLuck(liveState())}
        onWagerSelected={() => undefined}
        onOutcomeResolved={() => undefined}
        onClose={close}
      />
      {openId === "sleep-short" || openId === "sleep-long" ? (
        <IdleModeDialog key={openId} />
      ) : null}
      <ShopDialog
        isOpen={openId === "shop-all" || openId === "shop-gold"}
        onClose={close}
        onOpen={() => undefined}
      />
      <InvestDialog
        open={openId === "invest-small" || openId === "invest-large"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      />
      <AuthDialog
        key={openId === "auth-signup" ? "signup" : "signin"}
        isOpen={openId === "auth-signin" || openId === "auth-signup"}
        onClose={close}
        onAuthSuccess={close}
      />
      <EmailConfirmedDialog isOpen={openId === "email-confirmed"} onClose={close} />
      <SettingsDialog
        isOpen={openId === "settings-normal" || openId === "settings-ios"}
        onClose={close}
        currentUser={null}
        marketingOptIn={false}
        marketingPrefLoading={false}
        marketingRewardClaimed={false}
        onToggleMarketing={() => undefined}
        onDeleteAccount={() => undefined}
      />
      <RestartGameDialog
        key={openId === "restart-cruel" ? "cruel" : "plain"}
        isOpen={openId === "restart-plain" || openId === "restart-cruel"}
        onClose={close}
        onConfirm={close}
      />
      <DeleteAccountDialog
        isOpen={openId === "delete-account"}
        onClose={close}
        onConfirm={close}
      />
      {(openId === "away-timeout" || openId === "away-tab") &&
      inactivityReason != null ? (
        <InactivityDialog />
      ) : null}
      <SocialPromptDialog isOpen={openId === "social-prompt" && socialStoreOpen} />
      <ShareDialog />
      <LeaderboardDialog
        isOpen={openId === "ranks-blank" || openId === "ranks-named"}
        onClose={close}
      />
      <FeedbackDialog />
      <StayConnectedDialog />
      <DemoTimeUpDialog preview={openId === "demo-time"} />
      <SteamDemoContinueDialog
        isOpen={openId === "demo-continue"}
        onContinue={close}
        onStartNew={close}
      />
    </div>
  );
}
