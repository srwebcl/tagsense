"use client";

export function RevokeAccessButton({
  userName,
  action,
}: {
  userName: string;
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(`¿Quitarle el acceso a ${userName}? Ya no va a poder entrar a TAGSENSE (su cuenta de login no se borra, solo pierde acceso a este tenant).`);
        if (!ok) e.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger">
        Quitar acceso
      </button>
    </form>
  );
}
