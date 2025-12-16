
import { useState, useMemo } from "react";
import { subDays, parseISO } from "date-fns";

type TimeRange = "1d" | "3d" | "7d" | "30d" | "all";

interface FilterableData {
  timestamp?: string;
  updated_at?: string;
  purchased_at?: string;
  created_at?: string;
}

export function useAdminFilters<T extends FilterableData>(data: T[]) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false);
  const [churnDays, setChurnDays] = useState<1 | 3 | 5 | 7>(3);

  const filterByTimeRange = <D extends FilterableData>(
    items: D[],
    dateField: keyof D,
  ): D[] => {
    if (timeRange === "all") return items;

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case "1d":
        cutoffDate = subDays(now, 1);
        break;
      case "3d":
        cutoffDate = subDays(now, 3);
        break;
      case "7d":
        cutoffDate = subDays(now, 7);
        break;
      case "30d":
        cutoffDate = subDays(now, 30);
        break;
      default:
        return items;
    }

    return items.filter((item) => {
      const dateValue = item[dateField];
      if (!dateValue || typeof dateValue !== "string") return false;
      const itemDate = parseISO(dateValue);
      return itemDate >= cutoffDate;
    });
  };

  return {
    timeRange,
    setTimeRange,
    selectedUser,
    setSelectedUser,
    showCompletedOnly,
    setShowCompletedOnly,
    churnDays,
    setChurnDays,
    filterByTimeRange,
  };
}
