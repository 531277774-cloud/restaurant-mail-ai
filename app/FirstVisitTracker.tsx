"use client";

import { trackFirstVisit } from "@/lib/tracking";
import { useEffect } from "react";

export default function FirstVisitTracker() {
  useEffect(() => {
    trackFirstVisit();
  }, []);

  return null;
}
