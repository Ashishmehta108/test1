import { StampArt, type StampState } from "./StampArt";

const PX = { sm: 32, md: 44, lg: 64 } as const;
export type SealSize = keyof typeof PX;

/**
 * A stamp. Every stamp has its own bright colour (see STAMP_HUE in StampArt.tsx). Three looks, told apart by more than colour:
 *   earned      a solid perforated edge in its colour, a tinted face and a full ring inside it
 *   in progress its colour at part strength, with an arc along the ring showing how far along (only when `progress` is above 0)
 *   not yet     grey, a dashed edge and nothing inside it
 *
 * `id` is the stamp's id from STAMPS: with it the stamp shows its drawing, without it (or with an id that has no
 * drawing) it shows the written `mark` instead. `progress` runs from 0 to 1 and only matters when not earned.
 */
export function Seal({
  mark,
  earned = false,
  id,
  size = "md",
  progress = 0,
}: {
  mark: string;
  earned?: boolean;
  id?: string;
  size?: SealSize;
  progress?: number;
}) {
  const state: StampState = earned ? "earned" : progress > 0 ? "near" : "none";
  return <StampArt id={id} mark={mark} state={state} progress={progress} px={PX[size]} className={`st-${size}`} />;
}
