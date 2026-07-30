import type { Metadata } from "next";
import { DeleteAccountPortal } from "../components/DeleteAccountPortal";

export const metadata: Metadata = {
  title: "Eliminar cuenta | UP Training Center",
  description:
    "Portal de UP Training Center para eliminar una cuenta y sus datos asociados.",
};

export default function DeleteAccountPage() {
  return <DeleteAccountPortal />;
}
