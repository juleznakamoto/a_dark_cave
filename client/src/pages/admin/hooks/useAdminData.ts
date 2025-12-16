
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import type { ButtonClickData, GameSaveData, PurchaseData, DailyActiveUser, EmailConfirmationStats } from "../types/adminData";

export function useAdminData(environment: "dev" | "prod") {
  const [rawClickData, setRawClickData] = useState<ButtonClickData[]>([]);
  const [rawGameSaves, setRawGameSaves] = useState<GameSaveData[]>([]);
  const [rawPurchases, setRawPurchases] = useState<PurchaseData[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [dauData, setDauData] = useState<DailyActiveUser[]>([]);
  const [emailConfirmationStats, setEmailConfirmationStats] = useState<EmailConfirmationStats>({
    allTime: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
    last30Days: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
    last7Days: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const response = await fetch(`/api/admin/data?env=${environment}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Admin data fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch admin data: ${response.status}`);
      }

      const data = await response.json();

      if (data.clicks) setRawClickData(data.clicks);
      if (data.saves) setRawGameSaves(data.saves);
      if (data.purchases) setRawPurchases(data.purchases);
      if (data.dau) setDauData(data.dau);
      if (typeof data.totalUserCount === "number") setTotalUserCount(data.totalUserCount);
      if (data.emailConfirmationStats) setEmailConfirmationStats(data.emailConfirmationStats);

      const userIdsWithClicks = new Set<string>();
      data.clicks?.forEach((c: any) => userIdsWithClicks.add(c.user_id));

      const userList = Array.from(userIdsWithClicks).map((id) => ({
        id,
        email: id.substring(0, 8) + "...",
      }));

      setUsers(userList);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [environment]);

  return {
    rawClickData,
    rawGameSaves,
    rawPurchases,
    users,
    totalUserCount,
    dauData,
    emailConfirmationStats,
    loading,
    lastUpdated,
  };
}
