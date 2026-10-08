/** Subpixel slack so a 1px rounding gap does not swap labels for icons. */
const FIT_SLACK_PX = 1;

export type MeasuredTabSlot = {
  labelWidth: number;
  iconWidth: number;
};

export type EndTabIconChoice = {
  mapIcon: boolean;
  achievementsIcon: boolean;
};

/**
 * Map and Achievements prefer words. An icon is used only when that word
 * does not fit on the tab row and the icon is narrower than the word.
 * Achievements collapses first so a short "Map" label can stay visible.
 */
export function chooseEndTabIcons(input: {
  clientWidth: number;
  /** Tab-row content width excluding the map and achievements buttons. */
  otherWidth: number;
  map: MeasuredTabSlot | null;
  achievements: MeasuredTabSlot | null;
}): EndTabIconChoice {
  const width = (mapIcon: boolean, achievementsIcon: boolean) => {
    const mapW = input.map
      ? mapIcon
        ? input.map.iconWidth
        : input.map.labelWidth
      : 0;
    const achievementsW = input.achievements
      ? achievementsIcon
        ? input.achievements.iconWidth
        : input.achievements.labelWidth
      : 0;
    return input.otherWidth + mapW + achievementsW;
  };

  const fits = (mapIcon: boolean, achievementsIcon: boolean) =>
    width(mapIcon, achievementsIcon) <= input.clientWidth + FIT_SLACK_PX;

  const mapSaves =
    !!input.map && input.map.labelWidth > input.map.iconWidth + FIT_SLACK_PX;
  const achievementsSaves =
    !!input.achievements &&
    input.achievements.labelWidth >
      input.achievements.iconWidth + FIT_SLACK_PX;

  if (fits(false, false)) {
    return { mapIcon: false, achievementsIcon: false };
  }
  if (achievementsSaves && fits(false, true)) {
    return { mapIcon: false, achievementsIcon: true };
  }
  if (mapSaves && fits(true, false)) {
    return { mapIcon: true, achievementsIcon: false };
  }
  return {
    mapIcon: mapSaves,
    achievementsIcon: achievementsSaves,
  };
}
