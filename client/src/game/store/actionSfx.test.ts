import { afterEach, describe, expect, it, vi } from "vitest";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import {
  miningPlaybackRate,
  playActionStartSfx,
  shouldPlayPurchaseSfx,
} from "./actionSfx";

describe("purchase sfx", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plays the purchase cue for forest buy and sell", () => {
    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});

    playActionStartSfx("tradeGoldForFood", {
      forestUnlocked: true,
      caveExploreLevel: 0,
    });
    playActionStartSfx("sellLeatherBatch", {
      forestUnlocked: true,
      caveExploreLevel: 0,
    });

    expect(play).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenNthCalledWith(1, "purchase", SOUND_VOLUME.purchase);
    expect(play).toHaveBeenNthCalledWith(2, "purchase", SOUND_VOLUME.purchase);
  });

  it("leaves non-trade actions on their own cues", () => {
    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});

    playActionStartSfx("chopWood", {
      forestUnlocked: true,
      caveExploreLevel: 0,
    });

    expect(play).toHaveBeenCalledWith("chopWood", SOUND_VOLUME.chopWood);
  });

  it("plays the construct cue when a building starts, not later", () => {
    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});

    playActionStartSfx("buildWoodenHut", {
      forestUnlocked: false,
      caveExploreLevel: 0,
    });
    playActionStartSfx("repairBastion", {
      forestUnlocked: true,
      caveExploreLevel: 0,
    });

    expect(play).toHaveBeenNthCalledWith(
      1,
      "buildingComplete",
      SOUND_VOLUME.buildingComplete,
    );
    expect(play).toHaveBeenNthCalledWith(
      2,
      "buildingComplete",
      SOUND_VOLUME.buildingComplete,
    );
  });

  it("slows the mining cue 2.5% per Mine resource in unlock order", () => {
    expect(miningPlaybackRate("mineStone")).toBe(1);
    expect(miningPlaybackRate("mineIron")).toBe(0.975);
    expect(miningPlaybackRate("mineCoal")).toBe(0.95);
    expect(miningPlaybackRate("mineSulfur")).toBe(0.925);
    expect(miningPlaybackRate("mineObsidian")).toBe(0.9);
    expect(miningPlaybackRate("mineAdamant")).toBe(0.875);
    expect(miningPlaybackRate("mineMoonstone")).toBe(0.85);

    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});

    playActionStartSfx("mineMoonstone", {
      forestUnlocked: true,
      caveExploreLevel: 0,
    });

    expect(play).toHaveBeenCalledWith(
      "mining",
      SOUND_VOLUME.mining,
      false,
      0.85,
    );
  });

  it("matches goods trades and skips farewells and failed merchant deals", () => {
    expect(
      shouldPlayPurchaseSfx("merchant", "trade_clarity_elixir", {
        merchantTrades: { choices: [], purchasedIds: ["trade_clarity_elixir"] },
      }),
    ).toBe(true);
    expect(
      shouldPlayPurchaseSfx("merchant-12", "say_goodbye", {}),
    ).toBe(false);
    expect(
      shouldPlayPurchaseSfx("wandering_collector", "buy_bone_dice", {}),
    ).toBe(true);
    expect(
      shouldPlayPurchaseSfx("wandering_collector", "sell_nothing", {}),
    ).toBe(false);
    expect(shouldPlayPurchaseSfx("boneDevourer3", "sellBones", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("nordicWarAxe", "buyAxe", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("restlessKnight", "payGold", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("restlessKnightDesert", "paySilver", {})).toBe(
      true,
    );
    expect(shouldPlayPurchaseSfx("restlessKnightMountains", "payFood", {})).toBe(
      false,
    );
    expect(shouldPlayPurchaseSfx("witchsCurse", "payGold", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("mercenaryDemand", "payGold", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("mercenaryDemand", "giveRing", {})).toBe(
      false,
    );
    expect(shouldPlayPurchaseSfx("feast4", "makeGreatFeast", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("feast8", "makeGreatFeast", {})).toBe(true);
    expect(shouldPlayPurchaseSfx("feast4", "noFeast", {})).toBe(false);
    expect(shouldPlayPurchaseSfx("slaveTrader", "sellVillagers", {})).toBe(
      false,
    );
  });
});
