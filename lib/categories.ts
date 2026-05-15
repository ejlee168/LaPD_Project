import type { IconType } from "react-icons";
import {
  GiBandageRoll,
  GiBiceps,
  GiBrain,
  GiBrainstorm,
  GiSyringe,
  GiDrop,
  GiEmbryo,
  GiEyeball,
  GiHeartOrgan,
  GiHumanEar,
  GiKidneys,
  GiLungs,
  GiStethoscope,
  GiStomach,
} from "react-icons/gi";

export interface CategoryMeta {
  Icon: IconType;
  color: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Dermatology: {
    Icon: GiBandageRoll,
    color: "text-orange-400 dark:text-orange-200",
  },
  Endocrinology: {
    Icon: GiSyringe,
    color: "text-lime-800 dark:text-lime-400",
  },
  Gastrointestinal: {
    Icon: GiStomach,
    color: "text-orange-500 dark:text-orange-400",
  },
  "General Med": {
    Icon: GiStethoscope,
    color: "text-slate-500 dark:text-slate-400",
  },
  Haematology: { Icon: GiDrop, color: "text-red-500 dark:text-red-400" },
  Respiratory: { Icon: GiLungs, color: "text-pink-500 dark:text-pink-400" },
  Cardiovascular: {
    Icon: GiHeartOrgan,
    color: "text-rose-500 dark:text-rose-400",
  },
  Musculoskeletal: {
    Icon: GiBiceps,
    color: "text-gray-700 dark:text-white",
  },
  Reproductive: {
    Icon: GiEmbryo,
    color: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  Neurology: { Icon: GiBrain, color: "text-rose-400 dark:text-rose-400" },
  Nephrology: {
    Icon: GiKidneys,
    color: "text-rose-500 dark:text-rose-400",
  },
  Ophthalmology: {
    Icon: GiEyeball,
    color: "text-white bg-black rounded-full",
  },
  ENT: { Icon: GiHumanEar, color: "text-yellow-500 dark:text-yellow-400" },
  Psychiatry: {
    Icon: GiBrainstorm,
    color: "text-indigo-500 dark:text-indigo-400",
  },
};
