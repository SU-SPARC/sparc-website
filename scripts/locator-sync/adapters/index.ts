/* Adapter registry: sources.json `adapter` → implementation. */

import type { Adapter, AdapterName } from "../types";
import { ashby } from "./ashby";
import { devpost } from "./devpost";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { lumaIcal } from "./luma-ical";
import { meetupIcal } from "./meetup-ical";
import { mlh } from "./mlh";
import { simplify } from "./simplify";
import { suffolk } from "./suffolk";
import { workday } from "./workday";

export const ADAPTERS: { [A in AdapterName]: Adapter<A> } = {
  greenhouse,
  lever,
  ashby,
  workday,
  simplify,
  devpost,
  mlh,
  meetup_ical: meetupIcal,
  luma_ical: lumaIcal,
  suffolk,
};
