"use client";

import { ChangePasswordButton } from "./ChangePasswordButton";

export function ResetPasswordButton({
  userId,
  userName,
  action,
}: {
  userId: string;
  userName: string;
  action: (userId: string, nuevaContrasena?: string) => Promise<{ exito: boolean; password: string } | string>;
}) {
  const wrappedAction = async (uid: string, pass?: string) => {
    const res = await action(uid, pass);
    if (typeof res === "string") {
      return { exito: true, password: res };
    }
    return res;
  };

  return <ChangePasswordButton userId={userId} userName={userName} action={wrappedAction} />;
}

