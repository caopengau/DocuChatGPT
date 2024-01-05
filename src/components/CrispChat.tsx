"use client";

import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";

export const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("6fc30e39-4756-42b6-9778-d4a69ac7082e");
  }, []);

  return null;
};
