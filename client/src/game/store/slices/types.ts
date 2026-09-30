import type { StateCreator } from "zustand";
import type { GameStore } from "../types";

export type GameStoreCreator<T> = StateCreator<GameStore, [], [], T>;
